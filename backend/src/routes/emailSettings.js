async function routes(fastify, options) {
  const db = fastify.db;

  // Get all email settings
  fastify.get('/', async (request, reply) => {
    const result = await db.query('SELECT setting_key, setting_value FROM email_settings');

    // Convert to object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    return settings;
  });

  // Get specific setting
  fastify.get('/:key', async (request, reply) => {
    const { key } = request.params;
    const result = await db.query(
      'SELECT setting_value FROM email_settings WHERE setting_key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Setting not found' });
    }

    return { key, value: result.rows[0].setting_value };
  });

  // Update setting
  fastify.put('/:key', async (request, reply) => {
    const { key } = request.params;
    const { value } = request.body;

    const result = await db.query(
      `INSERT INTO email_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value]
    );

    return { key, value: result.rows[0].setting_value };
  });

  // Update multiple settings at once
  fastify.put('/', async (request, reply) => {
    const settings = request.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO email_settings (setting_key, setting_value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (setting_key)
           DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
          [key, value]
        );
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Preview email with header, body, and footer combined
  fastify.post('/preview', async (request, reply) => {
    const { body, includeHeaderFooter = true } = request.body;

    if (!includeHeaderFooter) {
      return { html: body };
    }

    // Get header and footer
    const settingsResult = await db.query(
      "SELECT setting_key, setting_value FROM email_settings WHERE setting_key IN ('email_header', 'email_footer')"
    );

    let header = '';
    let footer = '';
    settingsResult.rows.forEach(row => {
      if (row.setting_key === 'email_header') header = row.setting_value || '';
      if (row.setting_key === 'email_footer') footer = row.setting_value || '';
    });

    const fullHtml = `${header}${body}${footer}`;
    return { html: fullHtml };
  });

  // Reset to defaults
  fastify.post('/reset', async (request, reply) => {
    const defaultHeader = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; background: #ffffff; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Your Company Name</h1>
    </div>
    <div class="content">`;

    const defaultFooter = `    </div>
    <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
      <p>© 2024 Your Company Name. All rights reserved.</p>
      <p>123 Business Street, City, Country</p>
      <p><a href="#" style="color: #4F46E5;">Unsubscribe</a> | <a href="#" style="color: #4F46E5;">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>`;

    await db.query(
      `UPDATE email_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'email_header'`,
      [defaultHeader]
    );
    await db.query(
      `UPDATE email_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'email_footer'`,
      [defaultFooter]
    );

    return {
      success: true,
      email_header: defaultHeader,
      email_footer: defaultFooter
    };
  });
}

module.exports = routes;
