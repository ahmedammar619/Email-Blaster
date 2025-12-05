// Auth middleware to protect routes
const authMiddleware = (tokens) => {
  return async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const session = tokens.get(token);

    if (!session) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    request.user = {
      id: session.userId,
      username: session.username
    };
  };
};

module.exports = authMiddleware;
