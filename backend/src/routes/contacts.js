const { parse } = require('csv-parse');

async function routes(fastify, options) {
  const db = fastify.db;

  // Get all contacts
  fastify.get('/', async (request, reply) => {
    const { search, subscribed, limit = 100, offset = 0 } = request.query;

    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR company ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (subscribed !== undefined) {
      query += ` AND subscribed = $${paramIndex}`;
      params.push(subscribed === 'true');
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM contacts WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (search) {
      countQuery += ` AND (email ILIKE $${countIndex} OR first_name ILIKE $${countIndex} OR last_name ILIKE $${countIndex} OR company ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }

    if (subscribed !== undefined) {
      countQuery += ` AND subscribed = $${countIndex}`;
      countParams.push(subscribed === 'true');
    }

    const countResult = await db.query(countQuery, countParams);

    return {
      contacts: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  });

  // Get single contact
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query('SELECT * FROM contacts WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Contact not found' });
    }
    return result.rows[0];
  });

  // Create contact
  fastify.post('/', async (request, reply) => {
    const { email, first_name, last_name, company, tags, metadata } = request.body;

    try {
      const result = await db.query(
        `INSERT INTO contacts (email, first_name, last_name, company, tags, metadata)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [email, first_name, last_name, company, tags || [], metadata || {}]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'Email already exists' });
      }
      throw error;
    }
  });

  // Update contact
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { email, first_name, last_name, company, tags, metadata, subscribed } = request.body;

    const result = await db.query(
      `UPDATE contacts
       SET email = COALESCE($1, email),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           company = COALESCE($4, company),
           tags = COALESCE($5, tags),
           metadata = COALESCE($6, metadata),
           subscribed = COALESCE($7, subscribed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [email, first_name, last_name, company, tags, metadata, subscribed, id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Contact not found' });
    }
    return result.rows[0];
  });

  // Delete contact
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    await db.query('DELETE FROM contacts WHERE id = $1', [id]);
    return { success: true };
  });

  // Bulk delete contacts
  fastify.post('/bulk-delete', async (request, reply) => {
    const { ids } = request.body;
    await db.query('DELETE FROM contacts WHERE id = ANY($1)', [ids]);
    return { success: true, deleted: ids.length };
  });

  // Import contacts from CSV
  fastify.post('/import', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const chunks = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const csvContent = Buffer.concat(chunks).toString();

    const records = [];
    const parser = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    for await (const record of parser) {
      records.push(record);
    }

    const results = { imported: 0, skipped: 0, errors: [] };

    for (const record of records) {
      const email = record.email || record.Email || record.EMAIL;
      if (!email) {
        results.skipped++;
        continue;
      }

      try {
        await db.query(
          `INSERT INTO contacts (email, first_name, last_name, company)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET
             first_name = COALESCE(EXCLUDED.first_name, contacts.first_name),
             last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
             company = COALESCE(EXCLUDED.company, contacts.company),
             updated_at = CURRENT_TIMESTAMP`,
          [
            email,
            record.first_name || record.firstName || record.FirstName || null,
            record.last_name || record.lastName || record.LastName || null,
            record.company || record.Company || record.COMPANY || null
          ]
        );
        results.imported++;
      } catch (error) {
        results.errors.push({ email, error: error.message });
      }
    }

    return results;
  });

  // Unsubscribe contact
  fastify.post('/:id/unsubscribe', async (request, reply) => {
    const { id } = request.params;
    await db.query(
      'UPDATE contacts SET subscribed = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return { success: true };
  });

  // Get contact groups
  fastify.get('/groups', async (request, reply) => {
    const result = await db.query(`
      SELECT cg.*, COUNT(cgm.contact_id) as member_count
      FROM contact_groups cg
      LEFT JOIN contact_group_members cgm ON cg.id = cgm.group_id
      GROUP BY cg.id
      ORDER BY cg.created_at DESC
    `);
    return result.rows;
  });

  // Create contact group
  fastify.post('/groups', async (request, reply) => {
    const { name, description, contact_ids } = request.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const groupResult = await client.query(
        'INSERT INTO contact_groups (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
      );
      const group = groupResult.rows[0];

      if (contact_ids && contact_ids.length > 0) {
        for (const contactId of contact_ids) {
          await client.query(
            'INSERT INTO contact_group_members (contact_id, group_id) VALUES ($1, $2)',
            [contactId, group.id]
          );
        }
      }

      await client.query('COMMIT');
      return group;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}

module.exports = routes;
