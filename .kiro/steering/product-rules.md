---
inclusion: always
---

# HelpDesk 360 — Product Rules (Non-Negotiable)

These rules are graded requirements. Any violation is a defect, not a style choice.

## 1. Persistence
- Every ticket, assignment, and status change MUST be written to PostgreSQL BEFORE the API responds.
- `created_at` and `updated_at` are set by the DB/server in UTC. Never accept timestamps from the browser.
- `updated_at` MUST be updated in the same DB transaction as any status or assignment change.
- No authoritative state in browser memory, localStorage, or server-side globals.

## 2. No Fake Data
- Never display invented tickets, counts, or numbers.
- Empty database = honest empty states ("No open issues", etc.).
- Every count, chart value, and badge MUST come from a live SQL query.

## 3. Traceable Numbers
- Every dashboard widget MUST expose (via "Show query" toggle) the exact SQL string, tables used, and active filter parameters.

## 4. Server-Side Enforcement
- ALL validation, roles, and status rules are enforced in the backend.
- Invalid input → 400 with `{ message: "..." }`.
- Forbidden actions → 403 with `{ message: "..." }`.
- Missing/invalid JWT → 401.
- The server MUST NOT crash on bad input — return 400/422 instead.

## 5. AI Never Blocks a Write
- AI output is a suggestion only. It must be re-validated server-side against fixed enums before storing.
- If an AI call fails or times out (5s), return `{ aiUnavailable: true }` and let the user continue manually.
- Never let AI model output bypass server-side Zod validation.

## 6. Idempotent Submit
- A double-click on Submit creates EXACTLY one ticket.
- Use the `Idempotency-Key` header on `POST /api/tickets`.

## 7. Roles (summary)
- **employee**: create own tickets, read own tickets only, add comments on own tickets. Cannot change status or assignment.
- **technician**: read/manage all tickets, assign, change status, view dashboard.
- Employee reading another's ticket → 404 (not 403, to avoid ticket enumeration).
