const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('./db');
const campaignRoutes = require('./routes/campaigns');
const contactRoutes = require('./routes/contacts');
const emailRoutes = require('./routes/emails');
const templateRoutes = require('./routes/templates');

const start = async () => {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      }
    });

    // Register database
    fastify.decorate('db', db);

    // Register routes
    await fastify.register(campaignRoutes, { prefix: '/api/campaigns' });
    await fastify.register(contactRoutes, { prefix: '/api/contacts' });
    await fastify.register(emailRoutes, { prefix: '/api/emails' });
    await fastify.register(templateRoutes, { prefix: '/api/templates' });

    // Health check
    fastify.get('/api/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
