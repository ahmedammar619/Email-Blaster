const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const path = require('path');
// Load .env from backend folder (works in production) or parent folder (works in local dev)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const db = require('./db');
const campaignRoutes = require('./routes/campaigns');
const contactRoutes = require('./routes/contacts');
const emailRoutes = require('./routes/emails');
const templateRoutes = require('./routes/templates');
const emailAccountRoutes = require('./routes/emailAccounts');
const emailSettingsRoutes = require('./routes/emailSettings');

// Parse allowed origins from environment
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173';
  return origins.split(',').map(o => o.trim());
};

const start = async () => {
  try {
    // Register CORS with multiple origins support
    const allowedOrigins = getAllowedOrigins();
    await fastify.register(cors, {
      origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          cb(null, true);
          return;
        }

        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          cb(null, true);
        } else {
          // In development, allow all origins
          if (process.env.NODE_ENV === 'development') {
            cb(null, true);
          } else {
            cb(new Error('Not allowed by CORS'), false);
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
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
    await fastify.register(emailAccountRoutes, { prefix: '/api/email-accounts' });
    await fastify.register(emailSettingsRoutes, { prefix: '/api/email-settings' });

    // Public unsubscribe endpoint (no auth required)
    fastify.get('/unsubscribe/:token', async (request, reply) => {
      const { token } = request.params;

      try {
        // Decode token (base64 encoded email)
        const email = Buffer.from(token, 'base64').toString('utf-8');

        // Update contact subscription status
        const result = await db.query(
          'UPDATE contacts SET subscribed = false, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *',
          [email]
        );

        if (result.rows.length === 0) {
          return reply.code(404).type('text/html').send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Email Not Found</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                .message { padding: 30px; border-radius: 8px; background: #fee; }
                h1 { color: #c00; }
              </style>
            </head>
            <body>
              <div class="message">
                <h1>Email Not Found</h1>
                <p>We couldn't find this email address in our system.</p>
              </div>
            </body>
            </html>
          `);
        }

        const apiUrl = process.env.API_URL || 'http://localhost:3000';

        return reply.type('text/html').send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Unsubscribed Successfully</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .message { padding: 30px; border-radius: 8px; background: #e8f5e9; }
              h1 { color: #2e7d32; }
              .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; }
              .btn:hover { background: #4338CA; }
              .email { color: #666; font-size: 14px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="message">
              <h1>Unsubscribed Successfully</h1>
              <p>You have been unsubscribed from our mailing list.</p>
              <p class="email">${email}</p>
              <p>Changed your mind?</p>
              <a href="${apiUrl}/resubscribe/${token}" class="btn">Resubscribe</a>
            </div>
          </body>
          </html>
        `);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).type('text/html').send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .message { padding: 30px; border-radius: 8px; background: #fee; }
              h1 { color: #c00; }
            </style>
          </head>
          <body>
            <div class="message">
              <h1>Something went wrong</h1>
              <p>Please try again later or contact support.</p>
            </div>
          </body>
          </html>
        `);
      }
    });

    // Public resubscribe endpoint
    fastify.get('/resubscribe/:token', async (request, reply) => {
      const { token } = request.params;

      try {
        // Decode token (base64 encoded email)
        const email = Buffer.from(token, 'base64').toString('utf-8');

        // Update contact subscription status
        const result = await db.query(
          'UPDATE contacts SET subscribed = true, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *',
          [email]
        );

        if (result.rows.length === 0) {
          return reply.code(404).type('text/html').send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Email Not Found</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                .message { padding: 30px; border-radius: 8px; background: #fee; }
                h1 { color: #c00; }
              </style>
            </head>
            <body>
              <div class="message">
                <h1>Email Not Found</h1>
                <p>We couldn't find this email address in our system.</p>
              </div>
            </body>
            </html>
          `);
        }

        return reply.type('text/html').send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Resubscribed Successfully</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .message { padding: 30px; border-radius: 8px; background: #e3f2fd; }
              h1 { color: #1565c0; }
              .email { color: #666; font-size: 14px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="message">
              <h1>Welcome Back!</h1>
              <p>You have been resubscribed to our mailing list.</p>
              <p class="email">${email}</p>
            </div>
          </body>
          </html>
        `);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).type('text/html').send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .message { padding: 30px; border-radius: 8px; background: #fee; }
              h1 { color: #c00; }
            </style>
          </head>
          <body>
            <div class="message">
              <h1>Something went wrong</h1>
              <p>Please try again later or contact support.</p>
            </div>
          </body>
          </html>
        `);
      }
    });

    // Health check
    fastify.get('/api/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
    console.log(`Allowed CORS origins: ${getAllowedOrigins().join(', ')}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
