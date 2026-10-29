const jwt = require('jsonwebtoken');
const { store } = require('../store');

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-me';

function signAccess(user) {
  return jwt.sign({ sub: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: '15m' });
}
function signRefresh(sessionId, userId) {
  return jwt.sign({ sid: sessionId, sub: userId }, REFRESH_SECRET, { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized', message: 'Missing access token' });
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = store.users.get(payload.sub);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'unauthorized', message: 'Account not active' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = { signAccess, signRefresh, requireAuth, ACCESS_SECRET, REFRESH_SECRET };
