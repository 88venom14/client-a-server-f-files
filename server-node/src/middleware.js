const { parseToken } = require('./auth');

function requireAuth(secret) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'missing bearer token' });
    }
    try {
      const claims = parseToken(secret, h.slice(7));
      req.userId = claims.uid;
      next();
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
  };
}

module.exports = { requireAuth };
