const express = require('express');
const { store, newId, now } = require('../store');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

function validateTx(user, body, existing = null) {
  const merged = { ...existing, ...body };
  const { type, amountMinor, currency = 'INR', accountId, destinationAccountId, categoryId, note, occurredAt } = merged;
  if (!['income', 'expense', 'transfer'].includes(type)) return 'type must be income, expense or transfer';
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return 'amountMinor must be a positive safe integer';
  const account = store.accounts.get(accountId);
  if (!account || account.userId !== user.id || account.isArchived) return 'accountId must be an active account you own';
  if (type === 'transfer') {
    if (!destinationAccountId) return 'destinationAccountId required for transfer';
    const dest = store.accounts.get(destinationAccountId);
    if (!dest || dest.userId !== user.id || dest.isArchived || dest.id === accountId) return 'destination must be a different active account you own';
    if (dest.currency !== account.currency) return 'transfer accounts must share a currency';
    if (categoryId) return 'transfers have no category';
  } else {
    if (destinationAccountId) return 'destinationAccountId is transfer-only';
    const cat = store.categories.get(categoryId);
    if (!cat || cat.isArchived || (!cat.isSystem && cat.ownerUserId !== user.id) || cat.type !== type) return 'categoryId must exist and match the transaction type';
  }
  if (note && note.length > 500) return 'note too long';
  if (occurredAt && isNaN(new Date(occurredAt))) return 'occurredAt invalid';
  return null;
}
function own(req, id) { const t = store.transactions.get(id); return t && t.userId === req.user.id ? t : null; }

router.get('/', (req, res) => {
  const { type, categoryId, accountId, search, from, to, limit = 20, cursor } = req.query;
  let list = [...store.transactions.values()].filter((t) => t.userId === req.user.id)
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt) || (b.id > a.id ? 1 : -1));
  if (type) list = list.filter((t) => t.type === type);
  if (categoryId) list = list.filter((t) => t.categoryId === categoryId);
  if (accountId) list = list.filter((t) => t.accountId === accountId || t.destinationAccountId === accountId);
  if (from) list = list.filter((t) => new Date(t.occurredAt) >= new Date(from));
  if (to) list = list.filter((t) => new Date(t.occurredAt) <= new Date(to));
  if (search) list = list.filter((t) => (t.note || '').toLowerCase().includes(String(search).toLowerCase()));
  if (cursor) { const idx = list.findIndex((t) => t.id === cursor); if (idx >= 0) list = list.slice(idx + 1); }
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const page = list.slice(0, lim);
  res.json({ transactions: page, nextCursor: list.length > lim ? page[page.length - 1].id : null });
});

router.post('/', (req, res) => {
  const { idempotencyKey } = req.body || {};
  if (idempotencyKey) {
    const existingId = store.idempotencyKeys.get(`${req.user.id}:${idempotencyKey}`);
    if (existingId) return res.status(200).json({ transaction: store.transactions.get(existingId), duplicate: true });
  }
  const err = validateTx(req.user, req.body);
  if (err) return res.status(400).json({ error: 'validation', message: err });
  const { type, amountMinor, currency = 'INR', accountId, destinationAccountId = null, categoryId = null, note = '', occurredAt, source = 'manual' } = req.body;
  const t = { id: newId(), userId: req.user.id, type, amountMinor, currency, accountId, destinationAccountId, categoryId, note, occurredAt: occurredAt ? new Date(occurredAt) : now(), source, recurringRuleId: req.body.recurringRuleId || null, idempotencyKey: idempotencyKey || null, createdAt: now(), updatedAt: now() };
  store.transactions.set(t.id, t);
  if (idempotencyKey) store.idempotencyKeys.set(`${req.user.id}:${idempotencyKey}`, t.id);
  res.status(201).json({ transaction: t });
});

router.get('/:id', (req, res) => { const t = own(req, req.params.id); if (!t) return res.status(404).json({ error: 'not_found' }); res.json({ transaction: t }); });
router.patch('/:id', (req, res) => {
  const t = own(req, req.params.id); if (!t) return res.status(404).json({ error: 'not_found' });
  const err = validateTx(req.user, req.body, t);
  if (err) return res.status(400).json({ error: 'validation', message: err });
  Object.assign(t, req.body, { updatedAt: now() });
  if (req.body.occurredAt) t.occurredAt = new Date(req.body.occurredAt);
  res.json({ transaction: t });
});
router.delete('/:id', (req, res) => { const t = own(req, req.params.id); if (!t) return res.status(404).json({ error: 'not_found' }); store.transactions.delete(t.id); res.json({ ok: true }); });
module.exports = router;
