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

    // Get all settings
    const settingsResult = await db.query(
      "SELECT setting_key, setting_value FROM email_settings"
    );

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value || '';
    });

    const header = settings.email_header || '';
    const footer = settings.email_footer || '';
    const bodyBg = settings.body_background_color || '#f5f7fa';
    const contentBg = settings.content_background_color || '#ffffff';
    const contentWidth = settings.content_width || '550';
    const contentPadding = settings.content_padding || '30';
    const contentBorderRadius = settings.content_border_radius || '8';
    const contentMargin = settings.content_margin || '20';

    // Wrap with body background
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${bodyBg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bodyBg};">
    <tr>
      <td align="center" style="padding: ${contentMargin}px 0;">
        ${header}
        <table role="presentation" width="${contentWidth}" cellpadding="0" cellspacing="0" style="background-color: ${contentBg}; border-radius: ${contentBorderRadius}px;">
          <tr>
            <td style="padding: ${contentPadding}px;">
              ${body}
            </td>
          </tr>
        </table>
        ${footer}
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    const defaults = {
      email_header: defaultHeader,
      email_footer: defaultFooter,
      body_background_color: '#f5f7fa',
      content_background_color: '#ffffff',
      accent_color: '#1a73e8',
      content_width: '550',
      content_padding: '30',
      content_border_radius: '8',
      content_margin: '20'
    };

    for (const [key, value] of Object.entries(defaults)) {
      await db.query(
        `INSERT INTO email_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }

    return {
      success: true,
      ...defaults
    };
  });
}

module.exports = routes;
