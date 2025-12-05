const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const db = require('./index');

const migrate = async () => {
  try {
    console.log('Running migrations...');

    // Create templates table
    await db.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created templates table');

    // Create contacts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        company VARCHAR(255),
        tags TEXT[],
        metadata JSONB DEFAULT '{}',
        subscribed BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created contacts table');

    // Create contact_groups table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contact_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created contact_groups table');

    // Create contact_group_members table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contact_group_members (
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES contact_groups(id) ON DELETE CASCADE,
        PRIMARY KEY (contact_id, group_id)
      )
    `);
    console.log('Created contact_group_members table');

    // Create campaigns table
    await db.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        template_id INTEGER REFERENCES templates(id),
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        total_recipients INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created campaigns table');

    // Create campaign_recipients table
    await db.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        error_message TEXT,
        UNIQUE(campaign_id, contact_id)
      )
    `);
    console.log('Created campaign_recipients table');

    // Create email_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created email_logs table');

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
