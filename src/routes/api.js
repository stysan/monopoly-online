const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { signToken, authMiddleware } = require('../middleware/auth');

// ─── Auth ─────────────────────────────────────────────────────────

router.post('/auth/register', (req, res) => {
  const { username, password, avatar } = req.body;
  if (!username || !password) return res.json({ error: 'Username and password required' });
  if (username.length < 3 || username.length > 20) return res.json({ error: 'Username must be 3-20 chars' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.json({ error: 'Letters, numbers, underscores only' });
  if (password.length < 4) return res.json({ error: 'Password must be at least 4 chars' });

  const result = db.createUser(username, password, avatar);
  if (!result.success) return res.json({ error: result.error });

  const token = signToken({ id: result.id, username, avatar: avatar || 'top-hat' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ success: true, token, user: { id: result.id, username, avatar: avatar || 'top-hat' } });
});

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: 'Username and password required' });

  const user = db.verifyUser(username, password);
  if (!user) return res.json({ error: 'Invalid username or password' });

  const token = signToken({ id: user.id, username: user.username, avatar: user.avatar });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ success: true, token, user });
});

router.post('/auth/logout', authMiddleware, (req, res) => {
  db.setUserOnline(req.user.id, false);
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/auth/me', authMiddleware, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { ...user, ...req.user } });
});

// ─── Stats ────────────────────────────────────────────────────────

router.get('/stats/me/full', authMiddleware, (req, res) => {
  const stats = db.getUserStats(req.user.id);
  if (!stats) return res.status(404).json({ error: 'Not found' });
  res.json({ stats });
});

router.get('/stats/:username', (req, res) => {
  const stats = db.getUserStatsByUsername(req.params.username);
  if (!stats) return res.status(404).json({ error: 'User not found' });
  res.json({ stats });
});

// ─── Leaderboards ─────────────────────────────────────────────────

router.get('/leaderboard', (req, res) => {
  const type = req.query.type || 'wins';
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const data = db.getLeaderboard(type, limit);
  res.json({ type, data });
});

router.get('/online', (req, res) => {
  res.json({ count: db.getOnlineCount() });
});

module.exports = router;
