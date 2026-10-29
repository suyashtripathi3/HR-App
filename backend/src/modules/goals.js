const express = require('express');
const { store, newId, now } = require('../store');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
function own(req, id) { const g = store.goals.get(id); return g && g.userId === req.user.id ? g : null; }
function withProgress(g) {
  const contributions = [...store.goalContributions.values()].filter((c) => c.goalId === g.id);
  const savedMinor = contributions.reduce((a, c) => a + c.amountMinor, 0);
  return { ...g, savedMinor, contributions };
}
router.get('/', (req, res) => res.json({ goals: [...store.goals.values()].filter((g) => g.userId === req.user.id).map(withProgress) }));
router.post('/', (req, res) => {
  const { name, targetMinor, currency = 'INR', targetDate = null } = req.body || {};
  if (!name || !Number.isSafeInteger(targetMinor) || targetMinor <= 0) return res.status(400).json({ error: 'validation', message: 'name and positive targetMinor required' });
  const g = { id: newId(), userId: req.user.id, name, targetMinor, currency, targetDate: targetDate ? new Date(targetDate) : null, status: 'active', createdAt: now(), updatedAt: now() };
  store.goals.set(g.id, g);
  res.status(201).json({ goal: withProgress(g) });
});
router.post('/:id/contributions', (req, res) => {
  const g = own(req, req.params.id); if (!g) return res.status(404).json({ error: 'not_found' });
  const { amountMinor, currency = 'INR' } = req.body || {};
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return res.status(400).json({ error: 'validation', message: 'positive amountMinor required' });
  // Contribution is a tracked allocation, not new money (see PLAN.md).
  const c = { id: newId(), goalId: g.id, userId: req.user.id, amountMinor, currency, occurredAt: now(), createdAt: now() };
  store.goalContributions.set(c.id, c);
  const updated = withProgress(g);
  if (updated.savedMinor >= g.targetMinor) g.status = 'completed';
  res.status(201).json({ contribution: c, goal: updated });
});
router.patch('/:id', (req, res) => { const g = own(req, req.params.id); if (!g) return res.status(404).json({ error: 'not_found' }); Object.assign(g, req.body, { updatedAt: now() }); res.json({ goal: withProgress(g) }); });
module.exports = router;
