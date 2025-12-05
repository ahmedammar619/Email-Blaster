const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  replaceVariables(template, contact) {
    let result = template;
    result = result.replace(/{{firstName}}/g, contact.first_name || '');
    result = result.replace(/{{lastName}}/g, contact.last_name || '');
    result = result.replace(/{{email}}/g, contact.email || '');
    result = result.replace(/{{company}}/g, contact.company || '');

    // Replace any custom metadata variables
    if (contact.metadata) {
      Object.entries(contact.metadata).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
      });
    }

    return result;
  }

  async sendEmail({ to, subject, html, from }) {
    const mailOptions = {
      from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendBulkEmails(recipients, template, db, campaignId) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const contact of recipients) {
      const subject = this.replaceVariables(template.subject, contact);
      const html = this.replaceVariables(template.body, contact);

      const result = await this.sendEmail({
        to: contact.email,
        subject,
        html
      });

      // Log the email
      await db.query(
        `INSERT INTO email_logs (campaign_id, contact_id, to_email, subject, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [campaignId, contact.id, contact.email, subject, result.success ? 'sent' : 'failed', result.error || null]
      );

      // Update campaign recipient status
      await db.query(
        `UPDATE campaign_recipients
         SET status = $1, sent_at = $2, error_message = $3
         WHERE campaign_id = $4 AND contact_id = $5`,
        [result.success ? 'sent' : 'failed', result.success ? new Date() : null, result.error || null, campaignId, contact.id]
      );

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ email: contact.email, error: result.error });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update campaign stats
    await db.query(
      `UPDATE campaigns
       SET sent_count = sent_count + $1, failed_count = failed_count + $2,
           status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [results.sent, results.failed, campaignId]
    );

    return results;
  }
}

module.exports = new EmailService();
