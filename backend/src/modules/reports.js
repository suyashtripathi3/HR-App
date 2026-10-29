const express = require('express');
const { store } = require('../store');
const { requireAuth } = require('../middleware/auth');
const { userTransactions } = require('../utils/finance');
const router = express.Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  const { from, to } = req.query;
  let txs = userTransactions(req.user.id);
  if (from) txs = txs.filter((t) => new Date(t.occurredAt) >= new Date(from));
  if (to) txs = txs.filter((t) => new Date(t.occurredAt) <= new Date(to));
  const incomeMinor = txs.filter((t) => t.type === 'income').reduce((a, t) => a + t.amountMinor, 0);
  const expenseMinor = txs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amountMinor, 0);
  const byCategory = {};
  for (const t of txs) {
    const cat = store.categories.get(t.categoryId);
    const name = cat ? cat.name : (t.type === 'transfer' ? 'Transfer' : 'Unknown');
    byCategory[name] = (byCategory[name] || 0) + t.amountMinor;
  }
  res.json({ from: from || null, to: to || null, count: txs.length, incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor, byCategory });
});

router.post('/exports/transactions', (req, res) => {
  const { from, to, type } = req.body || {};
  let txs = userTransactions(req.user.id);
  if (from) txs = txs.filter((t) => new Date(t.occurredAt) >= new Date(from));
  if (to) txs = txs.filter((t) => new Date(t.occurredAt) <= new Date(to));
  if (type) txs = txs.filter((t) => t.type === type);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = 'date,type,amountMinor,currency,accountId,categoryId,note';
  const rows = txs.map((t) => [new Date(t.occurredAt).toISOString(), t.type, t.amountMinor, t.currency, t.accountId, t.categoryId || '', t.note || ''].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.send([header, ...rows].join('\n'));
});

// Notifications: budget threshold alerts + upcoming recurring rules.
router.get('/notifications', (req, res) => {
  const alerts = [];
  for (const b of store.budgets.values()) {
    if (b.userId !== req.user.id || !b.isActive) continue;
    const spent = userTransactions(req.user.id).filter((t) => t.type === 'expense' && (!b.categoryId || t.categoryId === b.categoryId)).reduce((a, t) => a + t.amountMinor, 0);
    const pct = b.limitMinor ? (spent / b.limitMinor) * 100 : 0;
    if (b.alertThresholds.some((th) => pct >= th)) alerts.push({ type: 'budget', budgetId: b.id, budgetName: b.name, percent: Math.round(pct), spentMinor: spent, limitMinor: b.limitMinor });
  }
  const upcoming = [...store.recurringRules.values()].filter((r) => r.userId === req.user.id && r.status === 'active');
  res.json({ alerts, upcomingRecurring: upcoming });
});
module.exports = router;
