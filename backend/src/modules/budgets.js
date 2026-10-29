const express = require('express');
const { store, newId, now } = require('../store');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
function own(req, id) { const b = store.budgets.get(id); return b && b.userId === req.user.id ? b : null; }
router.get('/', (req, res) => res.json({ budgets: [...store.budgets.values()].filter((b) => b.userId === req.user.id) }));
router.post('/', (req, res) => {
  const { name, categoryId = null, limitMinor, currency = 'INR', period = 'monthly', startDate, endDate = null, alertThresholds = [80, 100] } = req.body || {};
  if (!name || !Number.isSafeInteger(limitMinor) || limitMinor <= 0) return res.status(400).json({ error: 'validation', message: 'name and positive limitMinor required' });
  if (categoryId) { const c = store.categories.get(categoryId); if (!c || c.type !== 'expense') return res.status(400).json({ error: 'validation', message: 'category must be an expense category' }); }
  const b = { id: newId(), userId: req.user.id, name, categoryId, limitMinor, currency, period, startDate: startDate ? new Date(startDate) : now(), endDate: endDate ? new Date(endDate) : null, alertThresholds, isActive: true, createdAt: now(), updatedAt: now() };
  store.budgets.set(b.id, b);
  res.status(201).json({ budget: b });
});
router.patch('/:id', (req, res) => { const b = own(req, req.params.id); if (!b) return res.status(404).json({ error: 'not_found' }); Object.assign(b, req.body, { updatedAt: now() }); res.json({ budget: b }); });
router.delete('/:id', (req, res) => { const b = own(req, req.params.id); if (!b) return res.status(404).json({ error: 'not_found' }); store.budgets.delete(b.id); res.json({ ok: true }); });
module.exports = router;
