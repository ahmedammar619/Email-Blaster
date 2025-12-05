const emailService = require('../services/emailService');

async function routes(fastify, options) {
  const db = fastify.db;

  // Get all campaigns
  fastify.get('/', async (request, reply) => {
    const result = await db.query(`
      SELECT c.*, t.name as template_name
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  });

  // Get single campaign
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query(`
      SELECT c.*, t.name as template_name, t.subject, t.body
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Campaign not found' });
    }
    return result.rows[0];
  });

  // Create campaign
  fastify.post('/', async (request, reply) => {
    const { name, template_id, contact_ids } = request.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Create campaign
      const campaignResult = await client.query(
        `INSERT INTO campaigns (name, template_id, total_recipients)
         VALUES ($1, $2, $3) RETURNING *`,
        [name, template_id, contact_ids?.length || 0]
      );
      const campaign = campaignResult.rows[0];

      // Add recipients
      if (contact_ids && contact_ids.length > 0) {
        for (const contactId of contact_ids) {
          await client.query(
            `INSERT INTO campaign_recipients (campaign_id, contact_id) VALUES ($1, $2)`,
            [campaign.id, contactId]
          );
        }
      }

      await client.query('COMMIT');
      return campaign;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Update campaign
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, template_id, contact_ids } = request.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Update campaign
      await client.query(
        `UPDATE campaigns SET name = $1, template_id = $2, total_recipients = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [name, template_id, contact_ids?.length || 0, id]
      );

      // Update recipients
      if (contact_ids) {
        await client.query('DELETE FROM campaign_recipients WHERE campaign_id = $1', [id]);
        for (const contactId of contact_ids) {
          await client.query(
            `INSERT INTO campaign_recipients (campaign_id, contact_id) VALUES ($1, $2)`,
            [id, contactId]
          );
        }
      }

      await client.query('COMMIT');

      const result = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Delete campaign
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    await db.query('DELETE FROM campaigns WHERE id = $1', [id]);
    return { success: true };
  });

  // Get campaign recipients
  fastify.get('/:id/recipients', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query(`
      SELECT cr.*, c.email, c.first_name, c.last_name, c.company
      FROM campaign_recipients cr
      JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.campaign_id = $1
    `, [id]);
    return result.rows;
  });

  // Send campaign
  fastify.post('/:id/send', async (request, reply) => {
    const { id } = request.params;

    // Get campaign with template
    const campaignResult = await db.query(`
      SELECT c.*, t.subject, t.body
      FROM campaigns c
      JOIN templates t ON c.template_id = t.id
      WHERE c.id = $1
    `, [id]);

    if (campaignResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    if (!campaign.subject || !campaign.body) {
      return reply.code(400).send({ error: 'Campaign has no template assigned' });
    }

    // Update status to sending
    await db.query(
      `UPDATE campaigns SET status = 'sending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Get recipients
    const recipientsResult = await db.query(`
      SELECT c.*
      FROM campaign_recipients cr
      JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.campaign_id = $1 AND cr.status = 'pending' AND c.subscribed = true
    `, [id]);

    const template = { subject: campaign.subject, body: campaign.body };

    // Send emails in background
    emailService.sendBulkEmails(recipientsResult.rows, template, db, id)
      .catch(err => console.error('Error sending bulk emails:', err));

    return {
      success: true,
      message: `Sending emails to ${recipientsResult.rows.length} recipients`,
      recipientCount: recipientsResult.rows.length
    };
  });

  // Get campaign stats
  fastify.get('/:id/stats', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked
      FROM campaign_recipients
      WHERE campaign_id = $1
    `, [id]);
    return result.rows[0];
  });
}

module.exports = routes;
