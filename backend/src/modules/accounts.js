const express = require('express');
const { store, newId, now } = require('../store');
const { requireAuth } = require('../middleware/auth');
const { balanceForAccount } = require('../utils/finance');
const router = express.Router();
router.use(requireAuth);
function own(req, id) { const a = store.accounts.get(id); return a && a.userId === req.user.id ? a : null; }
router.get('/', (req, res) => {
  const list = [...store.accounts.values()].filter((a) => a.userId === req.user.id)
    .map((a) => ({ ...a, balanceMinor: balanceForAccount(a) }));
  res.json({ accounts: list });
});
router.post('/', (req, res) => {
  const { name, type, currency = 'INR', openingBalanceMinor = 0 } = req.body || {};
  if (!name || !['cash', 'bank', 'wallet', 'other'].includes(type)) return res.status(400).json({ error: 'validation', message: 'name and valid type required' });
  if (!Number.isSafeInteger(openingBalanceMinor) || openingBalanceMinor < 0) return res.status(400).json({ error: 'validation', message: 'openingBalanceMinor must be a non-negative safe integer' });
  const a = { id: newId(), userId: req.user.id, name, type, currency, openingBalanceMinor, isArchived: false, createdAt: now(), updatedAt: now() };
  store.accounts.set(a.id, a);
  res.status(201).json({ account: { ...a, balanceMinor: balanceForAccount(a) } });
});
router.get('/:id', (req, res) => { const a = own(req, req.params.id); if (!a) return res.status(404).json({ error: 'not_found' }); res.json({ account: { ...a, balanceMinor: balanceForAccount(a) } }); });
router.patch('/:id', (req, res) => {
  const a = own(req, req.params.id); if (!a) return res.status(404).json({ error: 'not_found' });
  const { name, isArchived } = req.body || {};
  if (name) a.name = name;
  if (typeof isArchived === 'boolean') a.isArchived = isArchived;
  a.updatedAt = now();
  res.json({ account: { ...a, balanceMinor: balanceForAccount(a) } });
});
module.exports = router;
