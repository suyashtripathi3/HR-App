const express = require('express');
const { store, newId, now } = require('../store');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.get('/', (req, res) => {
  const { type } = req.query;
  const list = [...store.categories.values()].filter((c) => !c.isArchived && (c.isSystem || c.ownerUserId === req.user.id) && (!type || c.type === type));
  res.json({ categories: list });
});
router.post('/', (req, res) => {
  const { name, type, icon, color } = req.body || {};
  if (!name || !['income', 'expense'].includes(type)) return res.status(400).json({ error: 'validation', message: 'name and income/expense type required' });
  const dup = [...store.categories.values()].find((c) => !c.isArchived && c.ownerUserId === req.user.id && c.name.toLowerCase() === name.toLowerCase() && c.type === type);
  if (dup) return res.status(409).json({ error: 'conflict', message: 'Category already exists' });
  const c = { id: newId(), ownerUserId: req.user.id, name, type, icon: icon || name, color: color || null, isSystem: false, isArchived: false, createdAt: now() };
  store.categories.set(c.id, c);
  res.status(201).json({ category: c });
});
module.exports = router;
