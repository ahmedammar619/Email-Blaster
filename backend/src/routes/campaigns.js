const emailService = require('../services/emailService');

async function routes(fastify, options) {
  const db = fastify.db;

  // Get all campaigns
  fastify.get('/', async (request, reply) => {
    const result = await db.query(`
      SELECT c.*, t.name as template_name, ea.name as email_account_name, ea.email as from_email
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN email_accounts ea ON c.email_account_id = ea.id
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  });

  // Get single campaign
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query(`
      SELECT c.*, t.name as template_name, t.subject, t.body, ea.name as email_account_name, ea.email as from_email
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN email_accounts ea ON c.email_account_id = ea.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Campaign not found' });
    }
    return result.rows[0];
  });

  // Create campaign
  fastify.post('/', async (request, reply) => {
    const { name, template_id, contact_ids, email_account_id } = request.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Create campaign
      const campaignResult = await client.query(
        `INSERT INTO campaigns (name, template_id, email_account_id, total_recipients)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, template_id, email_account_id || null, contact_ids?.length || 0]
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
    const { name, template_id, contact_ids, email_account_id } = request.body;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Update campaign
      await client.query(
        `UPDATE campaigns SET name = $1, template_id = $2, email_account_id = $3, total_recipients = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [name, template_id, email_account_id || null, contact_ids?.length || 0, id]
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

  // Duplicate campaign
  fastify.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get original campaign
      const originalResult = await client.query(
        'SELECT * FROM campaigns WHERE id = $1',
        [id]
      );

      if (originalResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Campaign not found' });
      }

      const original = originalResult.rows[0];

      // Create new campaign
      const newCampaignResult = await client.query(
        `INSERT INTO campaigns (name, template_id, email_account_id, total_recipients, status)
         VALUES ($1, $2, $3, $4, 'draft') RETURNING *`,
        [`${original.name} (Copy)`, original.template_id, original.email_account_id, original.total_recipients]
      );
      const newCampaign = newCampaignResult.rows[0];

      // Copy recipients with fresh status
      await client.query(
        `INSERT INTO campaign_recipients (campaign_id, contact_id, status)
         SELECT $1, contact_id, 'pending'
         FROM campaign_recipients
         WHERE campaign_id = $2`,
        [newCampaign.id, id]
      );

      await client.query('COMMIT');
      return newCampaign;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Reset campaign to draft (for resending)
  fastify.post('/:id/reset', async (request, reply) => {
    const { id } = request.params;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Reset campaign status and counters
      await client.query(
        `UPDATE campaigns
         SET status = 'draft', sent_count = 0, failed_count = 0, sent_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      // Reset all recipient statuses to pending
      await client.query(
        `UPDATE campaign_recipients
         SET status = 'pending', sent_at = NULL, error_message = NULL
         WHERE campaign_id = $1`,
        [id]
      );

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

  // Add recipients to existing campaign
  fastify.post('/:id/recipients', async (request, reply) => {
    const { id } = request.params;
    const { contact_ids } = request.body;

    if (!contact_ids || contact_ids.length === 0) {
      return reply.code(400).send({ error: 'No contacts provided' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Check campaign exists and is draft
      const campaignResult = await client.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      if (campaignResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Campaign not found' });
      }
      if (campaignResult.rows[0].status !== 'draft') {
        return reply.code(400).send({ error: 'Can only add recipients to draft campaigns' });
      }

      // Add new recipients (ignore duplicates)
      let addedCount = 0;
      for (const contactId of contact_ids) {
        try {
          await client.query(
            `INSERT INTO campaign_recipients (campaign_id, contact_id, status)
             VALUES ($1, $2, 'pending')
             ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
            [id, contactId]
          );
          addedCount++;
        } catch (err) {
          // Skip duplicates
        }
      }

      // Update total count
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = $1',
        [id]
      );
      await client.query(
        'UPDATE campaigns SET total_recipients = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [countResult.rows[0].count, id]
      );

      await client.query('COMMIT');

      return { success: true, added: addedCount };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Get campaign recipients
  fastify.get('/:id/recipients', async (request, reply) => {
    const { id } = request.params;
    const result = await db.query(`
      SELECT cr.*, c.email, c.first_name, c.last_name, c.company
      FROM campaign_recipients cr
      JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.campaign_id = $1
      ORDER BY cr.sent_at DESC NULLS LAST
    `, [id]);
    return result.rows;
  });

  // Send campaign
  fastify.post('/:id/send', async (request, reply) => {
    const { id } = request.params;
    const { email_account_id } = request.body || {};

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

    // Get email account (use provided, campaign default, or system default)
    const accountId = email_account_id || campaign.email_account_id;
    let emailAccount = null;

    if (accountId) {
      const accountResult = await db.query('SELECT * FROM email_accounts WHERE id = $1', [accountId]);
      if (accountResult.rows.length > 0) {
        emailAccount = accountResult.rows[0];
      }
    } else {
      // Try to get default account
      const defaultResult = await db.query('SELECT * FROM email_accounts WHERE is_default = true LIMIT 1');
      if (defaultResult.rows.length > 0) {
        emailAccount = defaultResult.rows[0];
      }
    }

    if (!emailAccount && !process.env.SMTP_HOST) {
      return reply.code(400).send({ error: 'No email account selected and no default SMTP configured' });
    }

    // Update campaign with email account
    if (emailAccount) {
      await db.query('UPDATE campaigns SET email_account_id = $1 WHERE id = $2', [emailAccount.id, id]);
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
    emailService.sendBulkEmails(recipientsResult.rows, template, db, id, emailAccount)
      .catch(err => console.error('Error sending bulk emails:', err));

    return {
      success: true,
      message: `Sending emails to ${recipientsResult.rows.length} recipients`,
      recipientCount: recipientsResult.rows.length,
      emailAccount: emailAccount ? { id: emailAccount.id, name: emailAccount.name, email: emailAccount.email } : null
    };
  });

  // Get campaign stats (real-time)
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

    // Get campaign status
    const campaignResult = await db.query('SELECT status FROM campaigns WHERE id = $1', [id]);
    const campaignStatus = campaignResult.rows[0]?.status || 'draft';

    return {
      ...result.rows[0],
      campaign_status: campaignStatus,
      is_complete: campaignStatus === 'sent' || campaignStatus === 'draft'
    };
  });

  // Get live sending progress
  fastify.get('/:id/progress', async (request, reply) => {
    const { id } = request.params;

    // Get campaign status
    const campaignResult = await db.query(`
      SELECT c.status, c.sent_count, c.failed_count, c.total_recipients, ea.name as email_account_name
      FROM campaigns c
      LEFT JOIN email_accounts ea ON c.email_account_id = ea.id
      WHERE c.id = $1
    `, [id]);

    if (campaignResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    // Get recent recipient updates
    const recentResult = await db.query(`
      SELECT cr.status, cr.sent_at, cr.error_message, c.email, c.first_name, c.last_name
      FROM campaign_recipients cr
      JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.campaign_id = $1 AND cr.status != 'pending'
      ORDER BY cr.sent_at DESC
      LIMIT 20
    `, [id]);

    const processed = campaign.sent_count + campaign.failed_count;
    const progress = campaign.total_recipients > 0 ? Math.round((processed / campaign.total_recipients) * 100) : 0;

    return {
      status: campaign.status,
      email_account: campaign.email_account_name,
      total: campaign.total_recipients,
      sent: campaign.sent_count,
      failed: campaign.failed_count,
      pending: campaign.total_recipients - processed,
      progress,
      is_complete: campaign.status === 'sent',
      recent_recipients: recentResult.rows
    };
  });
}

module.exports = routes;
