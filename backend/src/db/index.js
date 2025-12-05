const { Pool } = require('pg');

// Validate DATABASE_URL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in your .env file');
  console.error('Example: postgresql://user:password@host:5432/database');
}

// Check if URL is valid
let isValidUrl = false;
try {
  if (connectionString) {
    const url = new URL(connectionString);
    if (!url.hostname) {
      console.error('ERROR: DATABASE_URL is missing hostname');
      console.error('Current value:', connectionString);
      console.error('Expected format: postgresql://user:password@hostname:port/database');
    } else {
      isValidUrl = true;
    }
  }
} catch (e) {
  console.error('ERROR: Invalid DATABASE_URL format');
  console.error('Current value:', connectionString);
  console.error('Expected format: postgresql://user:password@hostname:port/database');
}

const pool = isValidUrl ? new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

if (pool) {
  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
}

module.exports = {
  query: async (text, params) => {
    if (!pool) {
      throw new Error('Database not configured. Please check DATABASE_URL in .env file');
    }
    return pool.query(text, params);
  },
  pool
};
