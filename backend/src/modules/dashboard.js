const express = require('express');
const { store } = require('../store');
const { requireAuth } = require('../middleware/auth');
const { totalBalance, userTransactions, balanceForAccount } = require('../utils/finance');
const router = express.Router();
router.use(requireAuth);

function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}
router.get('/summary', (req, res) => {
  const nowD = new Date();
  const year = parseInt(req.query.year, 10) || nowD.getUTCFullYear();
  const month = parseInt(req.query.month, 10) || nowD.getUTCMonth() + 1;
  const { start, end } = monthRange(year, month);
  const txs = userTransactions(req.user.id).filter((t) => new Date(t.occurredAt) >= start && new Date(t.occurredAt) < end);
  const incomeMinor = txs.filter((t) => t.type === 'income').reduce((a, t) => a + t.amountMinor, 0);
  const expenseMinor = txs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amountMinor, 0);
  const byCategory = {};
  for (const t of txs.filter((t) => t.type === 'expense')) {
    const cat = store.categories.get(t.categoryId);
    const name = cat ? cat.name : 'Unknown';
    byCategory[name] = (byCategory[name] || 0) + t.amountMinor;
  }
  const budgets = [...store.budgets.values()].filter((b) => b.userId === req.user.id && b.isActive).map((b) => {
    const spent = txs.filter((t) => t.type === 'expense' && (!b.categoryId || t.categoryId === b.categoryId)).reduce((a, t) => a + t.amountMinor, 0);
    return { ...b, spentMinor: spent, remainingMinor: b.limitMinor - spent, percent: b.limitMinor ? Math.round((spent / b.limitMinor) * 100) : 0 };
  });
  res.json({
    totalBalanceMinor: totalBalance(req.user.id),
    month: { year, month, incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor },
    categoryBreakdown: byCategory,
    budgets,
    recentTransactions: userTransactions(req.user.id).slice(0, 10),
    accounts: [...store.accounts.values()].filter((a) => a.userId === req.user.id).map((a) => ({ ...a, balanceMinor: balanceForAccount(a) })),
  });
});
module.exports = router;
