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

## Phase 1 (current)

Foundation only: backend health endpoint, money/split logic with
tests, theme tokens, API client, and navigation skeleton.
Next: Phase 2 authentication (needs email/SMS provider choice +
MongoDB Atlas setup — those are not configured yet).
