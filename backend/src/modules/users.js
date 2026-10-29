const express = require('express');
const { store, publicUser } = require('../store');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/me', (req, res) => {
  const { name, preferences } = req.body || {};
  if (name) req.user.name = name;
  if (preferences) req.user.preferences = { ...req.user.preferences, ...preferences };
  req.user.updatedAt = new Date();
  res.json({ user: publicUser(req.user) });
});
router.delete('/me', (req, res) => {
  // Account deletion: mark deletionPending; shared group history is kept,
  // personal records are not exposed to other users after this.
  req.user.status = 'deletionPending';
  res.json({ ok: true, status: 'deletionPending' });
});
module.exports = router;
