const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let base;
function api(path, { method = 'GET', token, body } = {}) {
  return fetch(`${base}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})), text: null }));
}
async function registerAndLogin(email, name) {
  const reg = await api('/auth/register', { method: 'POST', body: { name, email, phone: `+91${Math.floor(1000000000 + Math.random() * 8999999999)}`, password: 'password123' } });
  assert.strictEqual(reg.status, 201, JSON.stringify(reg.data));
  const userId = reg.data.user.id;
  assert.strictEqual((await api('/auth/verify-email', { method: 'POST', body: { userId, code: '123456' } })).status, 200);
  assert.strictEqual((await api('/auth/verify-phone', { method: 'POST', body: { userId, code: '123456' } })).status, 200);
  const login = await api('/auth/login', { method: 'POST', body: { email, password: 'password123' } });
  assert.strictEqual(login.status, 200, JSON.stringify(login.data));
  return { userId, token: login.data.accessToken, refreshToken: login.data.refreshToken };
}

test('all modules end-to-end', async (t) => {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => server.close());

  const u1 = await registerAndLogin('a@test.dev', 'User One');
  const u2 = await registerAndLogin('b@test.dev', 'User Two');

  // Accounts + categories
  const cash = await api('/accounts', { method: 'POST', token: u1.token, body: { name: 'Cash', type: 'cash', openingBalanceMinor: 1000000 } });
  assert.strictEqual(cash.status, 201);
  const wallet = await api('/accounts', { method: 'POST', token: u1.token, body: { name: 'Wallet', type: 'wallet', openingBalanceMinor: 0 } });
  assert.strictEqual(wallet.status, 201);
  const cats = await api('/categories?type=expense', { token: u1.token });
  const food = cats.data.categories.find((c) => c.name.includes('Food'));
  assert.ok(food);

  // Transactions: income, expense, transfer, idempotency
  assert.strictEqual((await api('/transactions', { method: 'POST', token: u1.token, body: { type: 'income', amountMinor: 500000, accountId: cash.data.account.id, categoryId: (await api('/categories?type=income', { token: u1.token })).data.categories[0].id } })).status, 201);
  assert.strictEqual((await api('/transactions', { method: 'POST', token: u1.token, body: { type: 'expense', amountMinor: 25000, accountId: cash.data.account.id, categoryId: food.id, note: 'Lunch' } })).status, 201);
  assert.strictEqual((await api('/transactions', { method: 'POST', token: u1.token, body: { type: 'transfer', amountMinor: 100000, accountId: cash.data.account.id, destinationAccountId: wallet.data.account.id } })).status, 201);
  const dup1 = await api('/transactions', { method: 'POST', token: u1.token, body: { type: 'expense', amountMinor: 5000, accountId: cash.data.account.id, categoryId: food.id, idempotencyKey: 'k1' } });
  const dup2 = await api('/transactions', { method: 'POST', token: u1.token, body: { type: 'expense', amountMinor: 5000, accountId: cash.data.account.id, categoryId: food.id, idempotencyKey: 'k1' } });
  assert.strictEqual(dup2.data.duplicate, true);
  assert.strictEqual(dup1.data.transaction.id, dup2.data.transaction.id);

  const accounts = await api('/accounts', { token: u1.token });
  const cashNow = accounts.data.accounts.find((a) => a.id === cash.data.account.id);
  const walletNow = accounts.data.accounts.find((a) => a.id === wallet.data.account.id);
  // 1000000 + 500000 - 25000 - 5000 - 100000 = 1370000 ; wallet 100000
  assert.strictEqual(cashNow.balanceMinor, 1370000);
  assert.strictEqual(walletNow.balanceMinor, 100000);

  // Ownership: user2 cannot read user1's account
  assert.strictEqual((await api(`/accounts/${cash.data.account.id}`, { token: u2.token })).status, 404);

  // Dashboard, budget, goal
  const dash = await api('/dashboard/summary', { token: u1.token });
  assert.strictEqual(dash.data.totalBalanceMinor, 1470000);
  const budget = await api('/budgets', { method: 'POST', token: u1.token, body: { name: 'Food', categoryId: food.id, limitMinor: 200000 } });
  assert.strictEqual(budget.status, 201);
  const goal = await api('/goals', { method: 'POST', token: u1.token, body: { name: 'Trip', targetMinor: 100000 } });
  assert.strictEqual(goal.status, 201);
  const contrib = await api(`/goals/${goal.data.goal.id}/contributions`, { method: 'POST', token: u1.token, body: { amountMinor: 20000 } });
  assert.strictEqual(contrib.data.goal.savedMinor, 20000);

  // Recurring: process due once
  const rule = await api('/recurring-rules', { method: 'POST', token: u1.token, body: { type: 'expense', amountMinor: 10000, accountId: cash.data.account.id, categoryId: food.id, frequency: 'monthly', startDate: new Date().toISOString() } });
  assert.strictEqual(rule.status, 201);
  const proc = await api('/recurring-rules/process-due', { method: 'POST', token: u1.token });
  assert.strictEqual(proc.data.created.length, 1);

  // Group Hisab: 2 members, ₹900 expense, payer owed ₹450
  const group = await api('/groups', { method: 'POST', token: u1.token, body: { name: 'Trip' } });
  assert.strictEqual(group.status, 201);
  assert.strictEqual((await api(`/groups/${group.data.group.id}/members`, { method: 'POST', token: u1.token, body: { email: 'b@test.dev' } })).status, 201);
  const gexp = await api(`/groups/${group.data.group.id}/expenses`, { method: 'POST', token: u1.token, body: { description: 'Dinner', amountMinor: 90000, paidByUserId: u1.userId, splitType: 'equal' } });
  assert.strictEqual(gexp.status, 201, JSON.stringify(gexp.data));
  assert.deepStrictEqual(gexp.data.expense.splits.map((s) => s.shareMinor).sort(), [45000, 45000]);
  const balances = await api(`/groups/${group.data.group.id}/balances`, { token: u1.token });
  assert.strictEqual(balances.data.balances.find((b) => b.userId === u1.userId).netMinor, 45000);
  assert.strictEqual(balances.data.balances.find((b) => b.userId === u2.userId).netMinor, -45000);
  const settle = await api(`/groups/${group.data.group.id}/settlements`, { method: 'POST', token: u1.token, body: { fromUserId: u2.userId, toUserId: u1.userId, amountMinor: 45000 } });
  assert.strictEqual(settle.status, 201);
  assert.strictEqual(settle.data.balances.find((b) => b.userId === u2.userId).netMinor, 0);
  const over = await api(`/groups/${group.data.group.id}/settlements`, { method: 'POST', token: u1.token, body: { fromUserId: u2.userId, toUserId: u1.userId, amountMinor: 1 } });
  assert.strictEqual(over.status, 400);

  // Reports + export + notifications
  const report = await api('/reports/summary', { token: u1.token });
  assert.ok(report.data.expenseMinor > 0);
  const csvRes = await fetch(`${base}/api/v1/reports/exports/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u1.token}` }, body: '{}' });
  assert.strictEqual(csvRes.status, 200);
  assert.ok((await csvRes.text()).startsWith('date,type,amountMinor'));
  const notif = await api('/reports/notifications', { token: u1.token });
  assert.ok(Array.isArray(notif.data.upcomingRecurring));

  // Auth refresh + logout rotation
  const refreshed = await api('/auth/refresh', { method: 'POST', body: { refreshToken: u1.refreshToken } });
  assert.strictEqual(refreshed.status, 200);
  assert.strictEqual((await api('/auth/refresh', { method: 'POST', body: { refreshToken: u1.refreshToken } })).status, 401);
});
