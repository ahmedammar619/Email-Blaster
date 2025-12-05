const emailService = require('../services/emailService');

async function routes(fastify, options) {
  const db = fastify.db;

  // Get email logs
  fastify.get('/logs', async (request, reply) => {
    const { campaign_id, status, limit = 100, offset = 0 } = request.query;

    let query = `
      SELECT el.*, c.first_name, c.last_name
      FROM email_logs el
      LEFT JOIN contacts c ON el.contact_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (campaign_id) {
      query += ` AND el.campaign_id = $${paramIndex}`;
      params.push(campaign_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND el.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY el.sent_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  });

  // Get email stats
  fastify.get('/stats', async (request, reply) => {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days') as last_7d
      FROM email_logs
    `);
    return result.rows[0];
  });

  // Send test email
  fastify.post('/test', async (request, reply) => {
    const { to, subject, body } = request.body;

    if (!to || !subject || !body) {
      return reply.code(400).send({ error: 'Missing required fields: to, subject, body' });
    }

    const result = await emailService.sendEmail({ to, subject, html: body });

    if (result.success) {
      return { success: true, messageId: result.messageId };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  });

  // Verify SMTP connection
  fastify.get('/verify-smtp', async (request, reply) => {
    const result = await emailService.verifyConnection();
    return result;
  });

  // Send single email
  fastify.post('/send', async (request, reply) => {
    const { to, subject, body, template_id, contact_id } = request.body;

    let finalSubject = subject;
    let finalBody = body;

    // If template_id is provided, fetch template
    if (template_id) {
      const templateResult = await db.query(
        'SELECT * FROM templates WHERE id = $1',
        [template_id]
      );
      if (templateResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Template not found' });
      }
      const template = templateResult.rows[0];
      finalSubject = template.subject;
      finalBody = template.body;
    }

    // If contact_id is provided, personalize the email
    if (contact_id) {
      const contactResult = await db.query(
        'SELECT * FROM contacts WHERE id = $1',
        [contact_id]
      );
      if (contactResult.rows.length > 0) {
        const contact = contactResult.rows[0];
        finalSubject = emailService.replaceVariables(finalSubject, contact);
        finalBody = emailService.replaceVariables(finalBody, contact);
      }
    }

    const result = await emailService.sendEmail({
      to,
      subject: finalSubject,
      html: finalBody
    });

    // Log the email
    await db.query(
      `INSERT INTO email_logs (contact_id, to_email, subject, status, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [contact_id || null, to, finalSubject, result.success ? 'sent' : 'failed', result.error || null]
    );

    if (result.success) {
      return { success: true, messageId: result.messageId };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  });
}

module.exports = routes;
