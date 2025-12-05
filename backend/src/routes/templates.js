async function routes(fastify, options) {
  const db = fastify.db;

  // Get all templates
  fastify.get('/', async (request, reply) => {
    const result = await db.query('SELECT * FROM templates ORDER BY created_at DESC');
    return result.rows;
  });

  // Get single template
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query('SELECT * FROM templates WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    return result.rows[0];
  });

  // Create template
  fastify.post('/', async (request, reply) => {
    const { name, subject, body } = request.body;

    if (!name || !subject || !body) {
      return reply.code(400).send({ error: 'Missing required fields: name, subject, body' });
    }

    const result = await db.query(
      'INSERT INTO templates (name, subject, body) VALUES ($1, $2, $3) RETURNING *',
      [name, subject, body]
    );
    return result.rows[0];
  });

  // Update template
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, subject, body } = request.body;

    const result = await db.query(
      `UPDATE templates
       SET name = COALESCE($1, name),
           subject = COALESCE($2, subject),
           body = COALESCE($3, body),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [name, subject, body, id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    return result.rows[0];
  });

  // Delete template
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;

    // Check if template is used by any campaign
    const campaignCheck = await db.query(
      'SELECT COUNT(*) FROM campaigns WHERE template_id = $1',
      [id]
    );

    if (parseInt(campaignCheck.rows[0].count) > 0) {
      return reply.code(400).send({
        error: 'Cannot delete template that is used by campaigns'
      });
    }

    await db.query('DELETE FROM templates WHERE id = $1', [id]);
    return { success: true };
  });

  // Duplicate template
  fastify.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params;

    const original = await db.query('SELECT * FROM templates WHERE id = $1', [id]);

    if (original.rows.length === 0) {
      return reply.code(404).send({ error: 'Template not found' });
    }

    const template = original.rows[0];
    const result = await db.query(
      'INSERT INTO templates (name, subject, body) VALUES ($1, $2, $3) RETURNING *',
      [`${template.name} (Copy)`, template.subject, template.body]
    );

    return result.rows[0];
  });

  // Preview template with sample data
  fastify.post('/:id/preview', async (request, reply) => {
    const { id } = request.params;
    const sampleData = request.body || {};

    const result = await db.query('SELECT * FROM templates WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Template not found' });
    }

    const template = result.rows[0];

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

    // Replace variables with sample data
    let previewSubject = template.subject;
    let previewBody = template.body;

    const defaultData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      company: 'Acme Corp',
      ...sampleData
    };

    Object.entries(defaultData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewSubject = previewSubject.replace(regex, value);
      previewBody = previewBody.replace(regex, value);
    });

    // Wrap body with header and footer
    const fullBody = `${header}${previewBody}${footer}`;

    return {
      subject: previewSubject,
      body: fullBody
    };
  });
}

module.exports = routes;
