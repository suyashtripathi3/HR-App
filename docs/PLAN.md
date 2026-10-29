# HisabRakho (HR-App) — Plan

Source plan: https://chatgpt.com/share/6ae2d70f-10e4-83e8-8746-c8aa222bd480

**Important correction:** "HR" here is HisabRakho, a personal expense
tracker — not a human-resources app.

## Product in one line

Help users record spending in seconds, see income / expenses / balance
clearly, stick to budgets and savings goals, and settle shared expenses
in groups — with data synced through a backend, not stored only on-device.

## Confirmed decisions (from the shared plan)

- Stack: React Native CLI + JavaScript/JSX (mobile), Node.js + Express
  modular monolith (backend), MongoDB Atlas + Mongoose (database)
- Cloud-first sync; Group Hisab is in the MVP
- Auth: email + phone verification, short-lived access tokens +
  rotating refresh sessions, Argon2id password hashing
- Money: integer minor units only (paise, not floats); transfers are
  not income/expenses; group shares must sum exactly to the total
- App never connects directly to MongoDB — only via the secured API
- Navigation: Home, History, Add, Insights, Profile (central Add)

## Phases (planning estimate in the shared plan, ~10 weeks part-time)

1. Foundation — repo, backend health endpoint, theme, navigation
2. Authentication — register, verify email/phone, login, sessions
3. Personal finance core — accounts, transactions, dashboard, history
4. Budgets & insights — budgets, goals, charts, filters
5. Group Hisab — groups, equal/custom splits, balances, settlements
6. Recurring & reports — recurring rules, reminders, CSV export
7. Hardening & release — QA, security, performance, deployment

## Gaps / decisions still open in the shared plan

- A standalone App Flow document was promised but was not in the
  shared chat — it is outlined only in the technical doc. It needs
  writing before Phase 2 screens are built.
- Chart library differs across the shared docs (Victory Native vs
  gifted-charts). Decide after a native-compatibility check, not now.
- Email/SMS providers, exact dependency versions, and MongoDB Atlas
  project are not chosen yet — needed before Phase 2 verification
  can actually send codes.

## Phase 1 — done in this commit

- Backend: Express app, `GET /health` and `GET /api/v1/health`
- Core money logic + tests: paise conversion, account balance
  formula, equal-split remainder rule, group net balance
- Mobile: theme tokens, API client, navigation skeleton
- No secrets committed (`.env.example` only); no DB wired yet
