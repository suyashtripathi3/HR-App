const express = require('express');
const { store, newId, now } = require('../store');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function nextDate(from, frequency, interval = 1) {
  const d = new Date(from);
  if (frequency === 'daily') d.setDate(d.getDate() + interval);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7 * interval);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + interval);
  return d;
}
// Process due occurrences at most once, even on retries/overlap:
// each generated transaction carries an occurrence idempotency key.
function processDueRecurring(asOf = new Date()) {
  const created = [];
  for (const r of store.recurringRules.values()) {
    if (r.status !== 'active' || r.nextRunAt > asOf) continue;
    if (r.endDate && r.nextRunAt > r.endDate) { r.status = 'paused'; continue; }
    const occurrenceKey = `recurring:${r.id}:${r.nextRunAt.toISOString()}`;
    if (!store.idempotencyKeys.has(`${r.userId}:${occurrenceKey}`)) {
      const t = { id: newId(), userId: r.userId, type: r.type, amountMinor: r.amountMinor, currency: r.currency, accountId: r.accountId, destinationAccountId: null, categoryId: r.categoryId, note: `Recurring: ${r.id}`, occurredAt: r.nextRunAt, source: 'recurring', recurringRuleId: r.id, idempotencyKey: occurrenceKey, createdAt: now(), updatedAt: now() };
      store.transactions.set(t.id, t);
      store.idempotencyKeys.set(`${r.userId}:${occurrenceKey}`, t.id);
      created.push(t);
    }
    r.lastProcessedOccurrence = r.nextRunAt;
    r.nextRunAt = nextDate(r.nextRunAt, r.frequency, r.interval);
  }
  return created;
}

router.use(requireAuth);
function own(req, id) { const r = store.recurringRules.get(id); return r && r.userId === req.user.id ? r : null; }
router.get('/', (req, res) => res.json({ rules: [...store.recurringRules.values()].filter((r) => r.userId === req.user.id) }));
router.post('/', (req, res) => {
  const { type, amountMinor, currency = 'INR', accountId, categoryId, frequency = 'monthly', interval = 1, startDate, endDate = null, timezone = 'Asia/Kolkata' } = req.body || {};
  if (!['income', 'expense'].includes(type) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) return res.status(400).json({ error: 'validation', message: 'valid type and positive amountMinor required' });
  const a = store.accounts.get(accountId); if (!a || a.userId !== req.user.id) return res.status(400).json({ error: 'validation', message: 'account must be yours' });
  const r = { id: newId(), userId: req.user.id, type, amountMinor, currency, accountId, categoryId: categoryId || null, frequency, interval, startDate: startDate ? new Date(startDate) : now(), nextRunAt: startDate ? new Date(startDate) : now(), endDate: endDate ? new Date(endDate) : null, timezone, status: 'active', lastProcessedOccurrence: null, createdAt: now(), updatedAt: now() };
  store.recurringRules.set(r.id, r);
  res.status(201).json({ rule: r });
});
router.post('/process-due', (req, res) => res.json({ created: processDueRecurring(new Date()) }));
router.patch('/:id', (req, res) => { const r = own(req, req.params.id); if (!r) return res.status(404).json({ error: 'not_found' }); Object.assign(r, req.body, { updatedAt: now() }); res.json({ rule: r }); });
router.delete('/:id', (req, res) => { const r = own(req, req.params.id); if (!r) return res.status(404).json({ error: 'not_found' }); store.recurringRules.delete(r.id); res.json({ ok: true }); });
module.exports = router;
module.exports.processDueRecurring = processDueRecurring;
