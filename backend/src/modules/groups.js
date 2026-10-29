const express = require('express');
const { store, newId, now } = require('../store');
const { requireAuth } = require('../middleware/auth');
const { groupBalances, computeSplits } = require('../utils/finance');
const router = express.Router();
router.use(requireAuth);

function isMember(groupId, userId) { return [...store.memberships.values()].find((m) => m.groupId === groupId && m.userId === userId && m.status === 'active'); }
function requireMember(req, res, groupId) { if (!isMember(groupId, req.user.id)) { res.status(403).json({ error: 'forbidden', message: 'Only active group members may access this group' }); return false; } return true; }

router.get('/', (req, res) => {
  const ids = [...store.memberships.values()].filter((m) => m.userId === req.user.id && m.status === 'active').map((m) => m.groupId);
  res.json({ groups: ids.map((id) => store.groups.get(id)).filter(Boolean) });
});
router.post('/', (req, res) => {
  const { name, currency = 'INR' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
  const g = { id: newId(), name, createdBy: req.user.id, currency, status: 'active', createdAt: now(), updatedAt: now() };
  store.groups.set(g.id, g);
  const ownerMembership = { id: newId(), groupId: g.id, userId: req.user.id, role: 'owner', status: 'active', joinedAt: now(), leftAt: null };
  store.memberships.set(ownerMembership.id, ownerMembership);
  res.status(201).json({ group: g });
});
router.post('/:id/members', (req, res) => {
  const g = store.groups.get(req.params.id); if (!g) return res.status(404).json({ error: 'not_found' });
  if (!requireMember(req, res, g.id)) return;
  const { email, userId } = req.body || {};
  const target = userId ? store.users.get(userId) : [...store.users.values()].find((u) => u.email === String(email || '').trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'not_found', message: 'User not found — they must register first' });
  const existing = [...store.memberships.values()].find((m) => m.groupId === g.id && m.userId === target.id);
  if (existing) { existing.status = 'active'; return res.json({ membership: existing }); }
  const m = { id: newId(), groupId: g.id, userId: target.id, role: 'member', status: 'active', joinedAt: now(), leftAt: null };
  store.memberships.set(m.id, m);
  res.status(201).json({ membership: m });
});
router.get('/:id', (req, res) => {
  const g = store.groups.get(req.params.id); if (!g) return res.status(404).json({ error: 'not_found' });
  if (!requireMember(req, res, g.id)) return;
  res.json({ group: g, members: [...store.memberships.values()].filter((m) => m.groupId === g.id && m.status === 'active'), balances: groupBalances(g.id) });
});
router.post('/:id/expenses', (req, res) => {
  const g = store.groups.get(req.params.id); if (!g) return res.status(404).json({ error: 'not_found' });
  if (!requireMember(req, res, g.id)) return;
  const { description, amountMinor, paidByUserId, splitType = 'equal', splits } = req.body || {};
  if (!description || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) return res.status(400).json({ error: 'validation', message: 'description and positive amountMinor required' });
  if (!isMember(g.id, paidByUserId)) return res.status(400).json({ error: 'validation', message: 'payer must be an active member' });
  const members = [...store.memberships.values()].filter((m) => m.groupId === g.id && m.status === 'active');
  let participants = members;
  if (splits) {
    participants = splits.map((s) => ({ userId: s.userId }));
    for (const p of participants) if (!isMember(g.id, p.userId)) return res.status(400).json({ error: 'validation', message: 'split participants must be active members' });
  }
  try {
    const finalSplits = computeSplits(amountMinor, splitType, participants, splits);
    const e = { id: newId(), groupId: g.id, createdBy: req.user.id, paidByUserId, description, amountMinor, currency: g.currency, splitType, splits: finalSplits, occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : now(), status: 'active', createdAt: now(), updatedAt: now() };
    store.groupExpenses.set(e.id, e);
    res.status(201).json({ expense: e, balances: groupBalances(g.id) });
  } catch (err) { res.status(err.status || 400).json({ error: 'validation', message: err.message }); }
});
router.get('/:id/expenses', (req, res) => {
  const g = store.groups.get(req.params.id); if (!g) return res.status(404).json({ error: 'not_found' });
  if (!requireMember(req, res, g.id)) return;
  res.json({ expenses: [...store.groupExpenses.values()].filter((e) => e.groupId === g.id) });
});
router.post('/:id/settlements', (req, res) => {
  const g = store.groups.get(req.params.id); if (!g) return res.status(404).json({ error: 'not_found' });
  if (!requireMember(req, res, g.id)) return;
  const { fromUserId, toUserId, amountMinor } = req.body || {};
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return res.status(400).json({ error: 'validation', message: 'positive amountMinor required' });
  if (!isMember(g.id, fromUserId) || !isMember(g.id, toUserId)) return res.status(400).json({ error: 'validation', message: 'both parties must be active members' });
  const balances = groupBalances(g.id);
  const from = balances.find((b) => b.userId === fromUserId);
  // fromUser owes money when net is negative; settlement must not exceed what they owe.
  if (!from || -from.netMinor < amountMinor) return res.status(400).json({ error: 'validation', message: 'Settlement exceeds outstanding amount owed' });
  const s = { id: newId(), groupId: g.id, fromUserId, toUserId, amountMinor, currency: g.currency, status: 'recorded', recordedBy: req.user.id, occurredAt: now(), createdAt: now() };
  store.settlements.set(s.id, s);
  res.status(201).json({ settlement: s, balances: groupBalances(g.id) });
});
router.get('/:id/balances', (req, res) => {
  const g = store.groups.get(req.params.id); if (!g) return res.status(404).json({ error: 'not_found' });
  if (!requireMember(req, res, g.id)) return;
  res.json({ balances: groupBalances(g.id) });
});
module.exports = router;
