const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'hisabrakho-api', version: '0.2.0' }));
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', service: 'hisabrakho-api', version: '0.2.0' }));

// All modules under /api/v1. The mobile app never talks to MongoDB directly.
app.use('/api/v1/auth', require('./modules/auth'));
app.use('/api/v1/users', require('./modules/users'));
app.use('/api/v1/accounts', require('./modules/accounts'));
app.use('/api/v1/categories', require('./modules/categories'));
app.use('/api/v1/transactions', require('./modules/transactions'));
app.use('/api/v1/dashboard', require('./modules/dashboard'));
app.use('/api/v1/budgets', require('./modules/budgets'));
app.use('/api/v1/goals', require('./modules/goals'));
app.use('/api/v1/recurring-rules', require('./modules/recurring'));
app.use('/api/v1/groups', require('./modules/groups'));
app.use('/api/v1/reports', require('./modules/reports'));
// Notifications live under reports module for now: /api/v1/reports/notifications
// (kept there so the route table stays in one place; see reports.js)

app.use('/api/v1', (req, res) => res.status(404).json({ error: 'not_found', message: 'Route not implemented' }));
app.use((err, req, res, next) => res.status(500).json({ error: 'internal_error', message: 'Something went wrong' }));

module.exports = app;
