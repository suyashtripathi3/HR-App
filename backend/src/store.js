// In-memory store for development/testing.
// Shape mirrors the planned MongoDB collections (see docs/PLAN.md) so
// this can be swapped for Mongoose models without changing API contracts
// or service rules. NEVER use this for production financial data.
const crypto = require('crypto');

function newId() { return crypto.randomUUID(); }
function now() { return new Date(); }

const store = {
  users: new Map(),
  sessions: new Map(),
  verificationChallenges: new Map(),
  accounts: new Map(),
  categories: new Map(),
  transactions: new Map(),
  budgets: new Map(),
  goals: new Map(),
  goalContributions: new Map(),
  recurringRules: new Map(),
  groups: new Map(),
  memberships: new Map(),
  groupExpenses: new Map(),
  settlements: new Map(),
  idempotencyKeys: new Map(), // `${userId}:${key}` -> transaction id
};

// System categories, seeded once.
const SYSTEM_CATEGORIES = [
  ['Food & Dining', 'expense'], ['Travel', 'expense'], ['Shopping', 'expense'],
  ['Bills & Utilities', 'expense'], ['Health', 'expense'], ['Entertainment', 'expense'],
  ['Salary', 'income'], ['Freelance', 'income'], ['Interest', 'income'], ['Other Income', 'income'],
];
for (const [name, type] of SYSTEM_CATEGORIES) {
  const id = newId();
  store.categories.set(id, { id, ownerUserId: null, name, type, icon: name, color: null, isSystem: true, isArchived: false, createdAt: now() });
}

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

module.exports = { store, newId, now, publicUser };
