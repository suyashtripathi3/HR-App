const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Health — Phase 1 acceptance: backend responds, no DB required yet.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hisabrakho-api', version: '0.1.0' });
});
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'hisabrakho-api', version: '0.1.0' });
});

// Placeholder for future /api/v1 modules (auth, accounts, transactions, ...).
// They are added one module at a time, with validation + ownership checks,
// never by wiring the mobile app straight to MongoDB.
app.use('/api/v1', (req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not implemented yet' });
});

app.use((err, req, res, next) => {
  // Never log or return sensitive payloads here.
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
});

module.exports = app;
