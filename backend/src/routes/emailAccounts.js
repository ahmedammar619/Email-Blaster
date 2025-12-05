const nodemailer = require('nodemailer');

async function routes(fastify, options) {
  const db = fastify.db;

  // Get all email accounts
  fastify.get('/', async (request, reply) => {
    const result = await db.query(
      'SELECT id, name, email, smtp_host, smtp_port, smtp_user, smtp_secure, is_default, created_at FROM email_accounts ORDER BY is_default DESC, created_at DESC'
    );
    return result.rows;
  });

  // Get single email account
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query(
      'SELECT id, name, email, smtp_host, smtp_port, smtp_user, smtp_secure, is_default, created_at FROM email_accounts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Email account not found' });
    }
    return result.rows[0];
  });

  // Create email account
  fastify.post('/', async (request, reply) => {
    const { name, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, is_default } = request.body;

    // If setting as default, unset other defaults
    if (is_default) {
      await db.query('UPDATE email_accounts SET is_default = false WHERE is_default = true');
    }

    const result = await db.query(
      `INSERT INTO email_accounts (name, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, smtp_host, smtp_port, smtp_user, smtp_secure, is_default, created_at`,
      [name, email, smtp_host, smtp_port || 587, smtp_user, smtp_pass, smtp_secure || false, is_default || false]
    );
    return result.rows[0];
  });

  // Update email account
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, is_default } = request.body;

    // If setting as default, unset other defaults
    if (is_default) {
      await db.query('UPDATE email_accounts SET is_default = false WHERE is_default = true AND id != $1', [id]);
    }

    // Build update query dynamically (only update password if provided)
    let query, params;
    if (smtp_pass) {
      query = `UPDATE email_accounts
               SET name = $1, email = $2, smtp_host = $3, smtp_port = $4, smtp_user = $5, smtp_pass = $6, smtp_secure = $7, is_default = $8, updated_at = CURRENT_TIMESTAMP
               WHERE id = $9
               RETURNING id, name, email, smtp_host, smtp_port, smtp_user, smtp_secure, is_default, created_at`;
      params = [name, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, is_default, id];
    } else {
      query = `UPDATE email_accounts
               SET name = $1, email = $2, smtp_host = $3, smtp_port = $4, smtp_user = $5, smtp_secure = $6, is_default = $7, updated_at = CURRENT_TIMESTAMP
               WHERE id = $8
               RETURNING id, name, email, smtp_host, smtp_port, smtp_user, smtp_secure, is_default, created_at`;
      params = [name, email, smtp_host, smtp_port, smtp_user, smtp_secure, is_default, id];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Email account not found' });
    }
    return result.rows[0];
  });

  // Delete email account
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;

    // Check if account is used by any campaign
    const campaignCheck = await db.query(
      'SELECT COUNT(*) FROM campaigns WHERE email_account_id = $1',
      [id]
    );

    if (parseInt(campaignCheck.rows[0].count) > 0) {
      return reply.code(400).send({
        error: 'Cannot delete email account that is used by campaigns'
      });
    }

    await db.query('DELETE FROM email_accounts WHERE id = $1', [id]);
    return { success: true };
  });

  // Test email account connection
  fastify.post('/:id/test', async (request, reply) => {
    const { id } = request.params;
    const { test_email } = request.body;

    const result = await db.query(
      'SELECT * FROM email_accounts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Email account not found' });
    }

    const account = result.rows[0];

    try {
      const transporter = nodemailer.createTransport({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_secure,
        auth: {
          user: account.smtp_user,
          pass: account.smtp_pass
        }
      });

      // Verify connection
      await transporter.verify();

      // Send test email if address provided
      if (test_email) {
        await transporter.sendMail({
          from: account.email,
          to: test_email,
          subject: 'Test Email from Email Blaster',
          html: `
            <h1>Test Email</h1>
            <p>This is a test email from your Email Blaster service.</p>
            <p>Email Account: <strong>${account.name}</strong></p>
            <p>If you received this email, your SMTP configuration is working correctly!</p>
            <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
          `
        });
        return { success: true, message: 'Test email sent successfully' };
      }

      return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  // Set account as default
  fastify.post('/:id/set-default', async (request, reply) => {
    const { id } = request.params;

    await db.query('UPDATE email_accounts SET is_default = false WHERE is_default = true');
    await db.query('UPDATE email_accounts SET is_default = true WHERE id = $1', [id]);

    return { success: true };
  });
}

module.exports = routes;
