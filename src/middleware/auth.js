const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'monopoly_super_secret_key_change_in_production';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  req.user = payload;
  next();
}

function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie
    ?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  if (!token) return next(new Error('Not authenticated'));
  const payload = verifyToken(token);
  if (!payload) return next(new Error('Invalid token'));
  socket.user = payload;
  next();
}

module.exports = { signToken, verifyToken, authMiddleware, socketAuth, JWT_SECRET };
