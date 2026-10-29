# HR-App — HisabRakho

Personal expense tracker: record income/expenses fast, track budgets
and savings goals, and settle shared Group Hisab expenses.

**Note:** HR = HisabRakho here, not human resources.

- Plan: see [docs/PLAN.md](docs/PLAN.md) and the source shared chat
  linked there.
- Backend: `backend/` — Node.js + Express, `npm install && npm run dev`
  (health at http://localhost:8080/health), `npm test`
- Mobile: `mobile/` — React Native CLI + JavaScript skeleton.
  See `mobile/README.md` for local Android setup; this repo does not
  yet contain a built APK.

## Current status (2026-10-29)

All backend modules are implemented in dev form (in-memory store,
not MongoDB yet) and pass tests: auth, accounts, transactions,
dashboard, budgets, goals, recurring, groups, reports, export.
See `docs/PLAN.md` for the dev-vs-production notes.
Next: swap the in-memory store for MongoDB Atlas + Mongoose, and
wire a real email/SMS provider for verification codes.
