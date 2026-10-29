const { store } = require('../store');
const { accountBalance, equalSplit, groupNet } = require('./money');

// Derived balance — never a stored total that can drift.
function balanceForAccount(account) {
  let income = 0, expense = 0, tin = 0, tout = 0;
  for (const t of store.transactions.values()) {
    if (t.userId !== account.userId) continue;
    if (t.accountId === account.id) {
      if (t.type === 'income') income += t.amountMinor;
      if (t.type === 'expense') expense += t.amountMinor;
      if (t.type === 'transfer') tout += t.amountMinor;
    }
    if (t.type === 'transfer' && t.destinationAccountId === account.id) tin += t.amountMinor;
  }
  return accountBalance({ openingBalanceMinor: account.openingBalanceMinor, incomeMinor: income, expenseMinor: expense, transfersInMinor: tin, transfersOutMinor: tout });
}

function totalBalance(userId) {
  let total = 0;
  for (const a of store.accounts.values()) if (a.userId === userId && !a.isArchived) total += balanceForAccount(a);
  return total;
}

function userTransactions(userId) {
  return [...store.transactions.values()]
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt) || (b.id > a.id ? 1 : -1));
}

function groupBalances(groupId) {
  const members = [...store.memberships.values()].filter((m) => m.groupId === groupId && m.status === 'active');
  const result = {};
  for (const m of members) result[m.userId] = { userId: m.userId, paidMinor: 0, shareMinor: 0, settlementsReceivedMinor: 0, settlementsPaidMinor: 0 };
  for (const e of store.groupExpenses.values()) {
    if (e.groupId !== groupId || e.status !== 'active') continue;
    if (result[e.paidByUserId]) result[e.paidByUserId].paidMinor += e.amountMinor;
    for (const s of e.splits) if (result[s.userId]) result[s.userId].shareMinor += s.shareMinor;
  }
  for (const s of store.settlements.values()) {
    if (s.groupId !== groupId || !['active', 'recorded'].includes(s.status)) continue;
    if (result[s.toUserId]) result[s.toUserId].settlementsReceivedMinor += s.amountMinor;
    if (result[s.fromUserId]) result[s.fromUserId].settlementsPaidMinor += s.amountMinor;
  }
  return Object.values(result).map((r) => ({ ...r, netMinor: groupNet(r) }));
}

function computeSplits(amountMinor, splitType, participants, customShares) {
  // participants: [{userId}] ; customShares: [{userId, shareMinor|percentage}]
  if (splitType === 'equal') {
    const shares = equalSplit(amountMinor, participants.length);
    return participants.map((p, i) => ({ userId: p.userId, shareMinor: shares[i] }));
  }
  if (splitType === 'custom') {
    const shares = (customShares || []).map((s) => ({ userId: s.userId, shareMinor: s.shareMinor }));
    const sum = shares.reduce((a, s) => a + s.shareMinor, 0);
    if (sum !== amountMinor) throw Object.assign(new Error('Custom shares must sum exactly to the expense total'), { status: 400 });
    return shares;
  }
  if (splitType === 'percentage') {
    // Largest-remainder in paise, deterministic by participant order.
    const raw = (customShares || []).map((s) => ({ userId: s.userId, percentage: s.percentage, exact: (amountMinor * s.percentage) / 100 }));
    const pctSum = raw.reduce((a, s) => a + s.percentage, 0);
    if (pctSum !== 100) throw Object.assign(new Error('Percentages must sum to 100'), { status: 400 });
    const shares = raw.map((s) => ({ userId: s.userId, shareMinor: Math.floor(s.exact), frac: s.exact - Math.floor(s.exact), percentage: s.percentage }));
    let remainder = amountMinor - shares.reduce((a, s) => a + s.shareMinor, 0);
    shares.sort((a, b) => b.frac - a.frac);
    for (let i = 0; remainder > 0; i++, remainder--) shares[i % shares.length].shareMinor += 1;
    return shares.map(({ userId, shareMinor, percentage }) => ({ userId, shareMinor, percentage }));
  }
  throw Object.assign(new Error('Invalid splitType'), { status: 400 });
}

module.exports = { balanceForAccount, totalBalance, userTransactions, groupBalances, computeSplits };
