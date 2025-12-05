const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Default transporter from env (fallback)
    this.defaultTransporter = process.env.SMTP_HOST ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }) : null;
  }

  createTransporter(account) {
    return nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_secure,
      auth: {
        user: account.smtp_user,
        pass: account.smtp_pass
      }
    });
  }

  async verifyConnection(account) {
    try {
      const transporter = account ? this.createTransporter(account) : this.defaultTransporter;
      if (!transporter) {
        return { success: false, message: 'No SMTP configuration available' };
      }
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Generate unsubscribe token (base64 encoded email)
  generateUnsubscribeToken(email) {
    return Buffer.from(email).toString('base64');
  }

  // Generate unsubscribe URL
  getUnsubscribeUrl(email) {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const token = this.generateUnsubscribeToken(email);
    return `${apiUrl}/unsubscribe/${token}`;
  }

  replaceVariables(template, contact) {
    let result = template;
    result = result.replace(/{{firstName}}/g, contact.first_name || '');
    result = result.replace(/{{lastName}}/g, contact.last_name || '');
    result = result.replace(/{{email}}/g, contact.email || '');
    result = result.replace(/{{company}}/g, contact.company || '');
    result = result.replace(/{{unsubscribeUrl}}/g, this.getUnsubscribeUrl(contact.email));

    // Replace any custom metadata variables
    if (contact.metadata) {
      Object.entries(contact.metadata).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
      });
    }

    return result;
  }

  async getEmailSettings(db) {
    try {
      const result = await db.query(
        "SELECT setting_key, setting_value FROM email_settings"
      );

      const settings = {
        header: '',
        footer: '',
        bodyBgColor: '#f5f7fa',
        contentBgColor: '#ffffff',
        accentColor: '#1a73e8',
        contentWidth: '550',
        contentPadding: '30',
        contentBorderRadius: '8',
        contentMargin: '20'
      };

      result.rows.forEach(row => {
        if (row.setting_key === 'email_header') settings.header = row.setting_value || '';
        if (row.setting_key === 'email_footer') settings.footer = row.setting_value || '';
        if (row.setting_key === 'body_background_color') settings.bodyBgColor = row.setting_value || '#f5f7fa';
        if (row.setting_key === 'content_background_color') settings.contentBgColor = row.setting_value || '#ffffff';
        if (row.setting_key === 'accent_color') settings.accentColor = row.setting_value || '#1a73e8';
        if (row.setting_key === 'content_width') settings.contentWidth = row.setting_value || '550';
        if (row.setting_key === 'content_padding') settings.contentPadding = row.setting_value || '30';
        if (row.setting_key === 'content_border_radius') settings.contentBorderRadius = row.setting_value || '8';
        if (row.setting_key === 'content_margin') settings.contentMargin = row.setting_value || '20';
      });

      return settings;
    } catch (error) {
      console.error('Error fetching email settings:', error);
      return {
        header: '',
        footer: '',
        bodyBgColor: '#f5f7fa',
        contentBgColor: '#ffffff',
        accentColor: '#1a73e8',
        contentWidth: '550',
        contentPadding: '30',
        contentBorderRadius: '8',
        contentMargin: '20'
      };
    }
  }

  wrapWithSettings(body, settings, unsubscribeUrl) {
    const { header, footer, bodyBgColor, contentBgColor, accentColor, contentWidth, contentPadding, contentBorderRadius, contentMargin } = settings;

    // Add unsubscribe link to footer if not already present
    let finalFooter = footer;
    if (!footer.includes('unsubscribe') && !footer.includes('Unsubscribe')) {
      finalFooter = `${footer}
        <table role="presentation" width="${contentWidth}" cellpadding="0" cellspacing="0" style="margin-top: 10px;">
          <tr>
            <td align="center" style="padding: 15px 0; font-size: 12px; color: #666;">
              <a href="${unsubscribeUrl}" style="color: ${accentColor}; text-decoration: underline;">Unsubscribe</a> from this mailing list
            </td>
          </tr>
        </table>`;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${bodyBgColor};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bodyBgColor};">
    <tr>
      <td align="center" style="padding: ${contentMargin}px 0;">
        ${header}
        <table role="presentation" width="${contentWidth}" cellpadding="0" cellspacing="0" style="background-color: ${contentBgColor}; border-radius: ${contentBorderRadius}px;">
          <tr>
            <td style="padding: ${contentPadding}px;">
              ${body}
            </td>
          </tr>
        </table>
        ${finalFooter}
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendEmail({ to, subject, html, from, account }) {
    const transporter = account ? this.createTransporter(account) : this.defaultTransporter;

    if (!transporter) {
      return { success: false, error: 'No SMTP configuration available' };
    }

    const fromAddress = from || (account ? account.email : process.env.SMTP_FROM || process.env.SMTP_USER);

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${this.getUnsubscribeUrl(to)}>`
      }
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendBulkEmails(recipients, template, db, campaignId, emailAccount) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Get email settings (header, footer, colors)
    const emailSettings = await this.getEmailSettings(db);

    for (const contact of recipients) {
      const subject = this.replaceVariables(template.subject, contact);
      let body = this.replaceVariables(template.body, contact);
      const unsubscribeUrl = this.getUnsubscribeUrl(contact.email);

      // Wrap with header, footer, and background colors
      const html = this.wrapWithSettings(body, emailSettings, unsubscribeUrl);

      const result = await this.sendEmail({
        to: contact.email,
        subject,
        html,
        account: emailAccount
      });

      // Log the email
      await db.query(
        `INSERT INTO email_logs (campaign_id, contact_id, to_email, subject, status, error_message, email_account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [campaignId, contact.id, contact.email, subject, result.success ? 'sent' : 'failed', result.error || null, emailAccount?.id || null]
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

      // Update campaign stats in real-time
      await db.query(
        `UPDATE campaigns
         SET sent_count = $1, failed_count = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [results.sent, results.failed, campaignId]
      );

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark campaign as sent
    await db.query(
      `UPDATE campaigns
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [campaignId]
    );

    return results;
  }
}

module.exports = new EmailService();
