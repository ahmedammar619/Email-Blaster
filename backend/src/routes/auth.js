const crypto = require('crypto');

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Token expiration: 3 days in milliseconds
const TOKEN_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

module.exports = async function (fastify, opts) {
  const db = fastify.db;
  const tokens = fastify.authTokens;

  // Login
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password required' });
    }

    try {
      const result = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const hashedPassword = hashPassword(password);

      if (user.password !== hashedPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken();
      tokens.set(token, {
        userId: user.id,
        username: user.username,
        createdAt: Date.now()
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      tokens.delete(token);
    }
    return { message: 'Logged out successfully' };
  });

  // Check auth status
  fastify.get('/me', async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    const session = tokens.get(token);

    if (!session) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    // Check if token has expired (3 days)
    if (Date.now() - session.createdAt > TOKEN_EXPIRY_MS) {
      tokens.delete(token);
      return reply.code(401).send({ error: 'Token expired. Please login again.' });
    }

    return {
      user: {
        id: session.userId,
        username: session.username
      }
    };
  });
};
