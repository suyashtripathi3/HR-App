const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { store, newId, now, publicUser } = require('../store');
const { signAccess, signRefresh, REFRESH_SECRET } = require('../middleware/auth');

const router = express.Router();
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

function makeCode() {
  // Test env uses a fixed code so automated tests can verify without SMS/email.
  if (process.env.NODE_ENV === 'test') return '123456';
  return String(Math.floor(100000 + Math.random() * 900000));
}
function createChallenge(userId, channel, purpose) {
  const code = makeCode();
  const ch = { id: newId(), userId, channel, purpose, destination: channel, codeHash: hash(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000), attemptCount: 0, consumedAt: null, createdAt: now() };
  store.verificationChallenges.set(ch.id, ch);
  return { challenge: ch, code };
}
function maybeActivate(user) {
  if (user.emailVerifiedAt && user.phoneVerifiedAt) user.status = 'active';
}
function issueSession(user, deviceLabel) {
  const session = { id: newId(), userId: user.id, refreshTokenHash: '', deviceLabel: deviceLabel || null, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), revokedAt: null, createdAt: now(), lastUsedAt: now() };
  const refreshToken = signRefresh(session.id, user.id);
  session.refreshTokenHash = hash(refreshToken);
  store.sessions.set(session.id, session);
  return { accessToken: signAccess(user), refreshToken };
}
function verifyChallenge(req, res, channel) {
  const { userId, code } = req.body || {};
  const ch = [...store.verificationChallenges.values()]
    .filter((c) => c.userId === userId && c.channel === channel && !c.consumedAt)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!ch) return res.status(400).json({ error: 'invalid_code', message: 'No active verification challenge' });
  if (ch.expiresAt < new Date()) return res.status(400).json({ error: 'expired_code', message: 'Code expired' });
  ch.attemptCount += 1;
  if (ch.attemptCount > 5) return res.status(429).json({ error: 'too_many_attempts', message: 'Too many attempts' });
  if (hash(code) !== ch.codeHash) return res.status(400).json({ error: 'invalid_code', message: 'Invalid code' });
  ch.consumedAt = now();
  const user = store.users.get(userId);
  if (!user) return res.status(404).json({ error: 'not_found' });
  if (channel === 'email') user.emailVerifiedAt = now();
  if (channel === 'phone') user.phoneVerifiedAt = now();
  maybeActivate(user);
  return res.json({ user: publicUser(user) });
}

const registerSchema = z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().min(7), password: z.string().min(8) });

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: parsed.error.issues.map((i) => i.message).join(', ') });
  const { name, email, phone, password } = parsed.data;
  const normEmail = email.trim().toLowerCase();
  const normPhone = phone.trim();
  for (const u of store.users.values()) {
    if (u.email === normEmail || u.phone === normPhone) return res.status(409).json({ error: 'conflict', message: 'Email or phone already registered' });
  }
  const user = { id: newId(), name, email: normEmail, phone: normPhone, passwordHash: await bcrypt.hash(password, 10), emailVerifiedAt: null, phoneVerifiedAt: null, status: 'pending', preferences: { currency: 'INR', timezone: 'Asia/Kolkata', theme: 'system' }, createdAt: now(), updatedAt: now() };
  store.users.set(user.id, user);
  const emailCh = createChallenge(user.id, 'email', 'registration');
  const phoneCh = createChallenge(user.id, 'phone', 'registration');
  // Dev only: return codes so the app can be tested without a provider.
  // Production must send these via email/SMS and never return them.
  const dev = process.env.NODE_ENV !== 'production' ? { devEmailCode: emailCh.code, devPhoneCode: phoneCh.code } : {};
  res.status(201).json({ user: publicUser(user), ...dev });
});

router.post('/verify-email', (req, res) => verifyChallenge(req, res, 'email'));
router.post('/verify-phone', (req, res) => verifyChallenge(req, res, 'phone'));

router.post('/login', async (req, res) => {
  const { email, password, deviceLabel } = req.body || {};
  // Generic response: do not reveal whether the email exists.
  const user = [...store.users.values()].find((u) => u.email === String(email || '').trim().toLowerCase());
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid credentials' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'not_verified', message: 'Verify email and phone first', userId: user.id });
  res.json({ user: publicUser(user), ...issueSession(user, deviceLabel) });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const session = store.sessions.get(payload.sid);
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.refreshTokenHash !== hash(refreshToken)) {
      return res.status(401).json({ error: 'unauthorized', message: 'Session revoked or expired' });
    }
    const user = store.users.get(session.userId);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'unauthorized' });
    // Rotate: revoke old, issue new.
    session.revokedAt = now();
    const issued = issueSession(user, session.deviceLabel);
    session.lastUsedAt = now();
    res.json({ user: publicUser(user), ...issued });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET);
      const s = store.sessions.get(payload.sid);
      if (s) s.revokedAt = now();
    } catch { /* logout is idempotent */ }
  }
  res.json({ ok: true });
});

module.exports = router;
