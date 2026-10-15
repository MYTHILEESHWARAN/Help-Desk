# HelpDesk 360 — Implementation Tasks

> Work through phases in order. Mark each task ✅ when verified. Never skip a phase's verification before starting the next.

---

## PHASE 0 — Scaffold
**Goal:** All three Docker services start and the health endpoint responds.

### Tasks

- [ ] **0.1** Create root `.gitignore` (node_modules, .env, dist, .turbo, *.log, coverage)
- [ ] **0.2** Create `.env.example` with all required keys and placeholder values
- [ ] **0.3** Create `docker-compose.yml` with services `db`, `backend`, `frontend`; named volume `pgdata`; db healthcheck; backend `depends_on: db (healthy)`; backend runs migrations + seed on start
- [ ] **0.4** Scaffold `backend/` folder: `package.json`, `tsconfig.json`, `src/index.ts` (Express app bootstrap with helmet, cors, rate-limit, pino, JSON body-parser)
- [ ] **0.5** Add `GET /api/health` route returning `{ status: "ok", timestamp }`
- [ ] **0.6** Create `backend/Dockerfile` (node:20-alpine, build + run)
- [ ] **0.7** Scaffold `frontend/` folder: Vite + React 18 + TypeScript template, install Tailwind CSS, shadcn/ui, TanStack Query, React Router
- [ ] **0.8** Create `frontend/Dockerfile` (node:20-alpine, Vite dev server for hackathon)
- [ ] **0.9** Create `.kiro/steering/product-rules.md` (sections 1–2 of prompt distilled)
- [ ] **0.10** Create `.kiro/steering/tech-conventions.md` (section 3 of prompt distilled)
- [ ] **0.11** Create `.kiro/steering/security-rules.md` (section 10 of prompt distilled)
- [ ] **0.12** Add root `README.md` skeleton with "Quick start" section

### Verification
```
docker compose up --build
curl http://localhost:4000/api/health   # → {"status":"ok","timestamp":"..."}
```
Expected: all three containers healthy, no crash logs.

---

## PHASE 1 — The Pipe
**Goal:** A ticket submitted from the browser is persisted to the DB and visible on refresh.

### Tasks

- [ ] **1.1** Install and configure Prisma; create `backend/prisma/schema.prisma` with the **users** and **tickets** tables only (minimal schema to unblock the pipe)
- [ ] **1.2** Write and run the initial Prisma migration (`prisma migrate dev --name init`)
- [ ] **1.3** Create `POST /api/tickets` route: Zod validation → Prisma insert → return ticket
- [ ] **1.4** Create `GET /api/tickets` route: Prisma findMany → return array (no auth yet, all tickets)
- [ ] **1.5** Create minimal frontend `NewTicketPage` with a form (title, description, category, priority) wired to the API via TanStack Query mutation
- [ ] **1.6** Create minimal frontend `TicketListPage` that fetches and displays tickets
- [ ] **1.7** Confirm idempotency-key header handling in the POST route (upsert on conflict)

### Verification
1. Submit a ticket via the form
2. `docker compose restart backend`
3. Refresh the browser — ticket still visible
4. Submit the same request twice with the same `Idempotency-Key` header — only one row in DB (`SELECT COUNT(*) FROM tickets`)

---

## PHASE 2 — Data Model and Auth
**Goal:** Full schema in place; login works; role enforcement active.

### Tasks

- [ ] **2.1** Extend `schema.prisma` to include `status_history`, `comments`, `notifications`, all enums, all indexes, and the `updated_at` trigger
- [ ] **2.2** Run migration and verify schema with `\d tickets` in psql
- [ ] **2.3** Add `pg_trgm` extension to migration; add GIN full-text and trigram indexes
- [ ] **2.4** Create `POST /api/auth/login` (bcrypt compare → JWT cookie)
- [ ] **2.5** Create `GET /api/auth/me` and `POST /api/auth/logout`
- [ ] **2.6** Create `authenticateJWT` middleware (reads httpOnly cookie, returns 401 if invalid)
- [ ] **2.7** Create `requireRole(role)` middleware factory
- [ ] **2.8** Protect all existing ticket routes with `authenticateJWT`; apply `requireRole` per section 5
- [ ] **2.9** Write idempotent seed script (`prisma/seed.ts`): 5 users (3 employees, 2 technicians); passwords from `SEED_PASSWORD` env
- [ ] **2.10** Add `npm run seed:small` script (5 tickets with history rows)
- [ ] **2.11** Confirm the `seed` runs on `docker compose up` (add `prisma db seed` to backend entrypoint after migrate)
- [ ] **2.12** Add frontend `AuthContext` + `LoginPage`; store nothing except the user object returned by `/api/auth/me` (JWT is in the cookie, not in state)
- [ ] **2.13** Add `ProtectedRoute` component with role guard

### Verification
```sql
SELECT id, username, role FROM users;
SELECT id, title, status, priority, category FROM tickets;
```
- Employee login → GET /api/tickets returns only own tickets
- Employee GET /api/tickets/:id for another's ticket → 404
- Employee PATCH /api/tickets/:id/status → 403

---

## PHASE 3 — Ticket Management
**Goal:** Full queue, filters, state machine, assignment, and history.

### Tasks

- [ ] **3.1** Implement `GET /api/tickets` with full filter/sort/pagination (status, priority, category, assigned_to, q, sort, order, page, pageSize); default urgent-first sort
- [ ] **3.2** Add full-text + trigram search for `q` parameter (use Postgres `ts_rank` + `similarity()`)
- [ ] **3.3** Implement `GET /api/tickets/:id` including joined history, comments, reporter, assignee
- [ ] **3.4** Implement `PATCH /api/tickets/:id/status`: state machine check → DB transaction (status update + history insert + updated_at)
- [ ] **3.5** Implement `PATCH /api/tickets/:id/assign`: validate assignee is a technician → DB transaction (assign + history insert + updated_at)
- [ ] **3.6** Implement `GET /api/users?role=technician`
- [ ] **3.7** Add SLA computation helper (`services/sla.ts`); attach SLA object to every ticket response
- [ ] **3.8** Add `npm run seed:large` (25+ tickets across all categories/priorities/statuses with history)
- [ ] **3.9** Frontend: `QueuePage` (technician) — filter bar, sortable table, urgent badge, SLA badge
- [ ] **3.10** Frontend: `TicketDetailPage` — timeline, status action buttons (legal next states only), assign dropdown (real technicians), `MyTicketsPage` (employee)

### Verification (Supertest suite: `backend/src/__tests__/tickets.test.ts`)
- [ ] Open → in-progress (allowed)
- [ ] Open → resolved (rejected, 400 with allowed states)
- [ ] Assign to employee user (400)
- [ ] Assign to non-existent user (400)
- [ ] Resolve with no assignee → auto-assigns to actor
- [ ] Employee reads another's ticket (404)
- [ ] Employee PATCH status (403)
- [ ] Title > 120 chars (400)
- [ ] Description > 5000 chars (400)
- [ ] Invalid category enum (400)
- [ ] Malformed JSON body (400)
- [ ] Missing JWT (401)
- [ ] Double-submit with same Idempotency-Key (one row created)

---

## PHASE 4 — Dashboard and Employee Tracking
**Goal:** Dashboard with real SQL counts, "Show query" toggle, SSE live updates.

### Tasks

- [ ] **4.1** Implement `GET /api/dashboard`: write 8 SQL queries for the metrics (open, urgentOpen, unassigned, inProgress, completed, byStatus, byPriority, byCategory, byTechnician, avgResolutionHours); return each with its `sql` string
- [ ] **4.2** Frontend `DashboardPage`: metric cards, charts (bar/donut via shadcn/ui or recharts), "Show query" toggle on each widget
- [ ] **4.3** Implement SSE: `GET /api/events`, `services/sse.ts` emitter, fan-out per role
- [ ] **4.4** Frontend SSE hook `useSSE`: `EventSource` wrapper → on event → invalidate relevant TanStack Query cache keys
- [ ] **4.5** Wire SSE to `TicketDetailPage` and `QueuePage` (live status/assignment updates)

### Verification
- Compare each dashboard count to a direct psql query — record in REPORT.md
- Open a ticket detail in browser, change status in another window → detail page updates without refresh
- Empty DB → all dashboard counts are 0

---

## PHASE 5 — Hardening
**Goal:** All hostile-input, empty-state, and idempotency tests pass; pre-freeze checklist green.

### Tasks

- [ ] **5.1** Add global Express error handler middleware (catches Prisma errors, Zod errors, unknown errors; never leaks stack traces in production)
- [ ] **5.2** Add `express-rate-limit` for general API (100/min), login (5/min), AI (20/min)
- [ ] **5.3** Add `npm run seed:hostile` script (XSS payloads, SQL injection text, boundary-length strings) — never loaded by default
- [ ] **5.4** Write Supertest hostile-input tests (`backend/src/__tests__/hostile.test.ts`)
  - Empty title → 400
  - 10,001 char description → 400
  - `<script>alert(1)</script>` as title → stored as plain text, returned escaped in JSON
  - SQL injection string as description → stored safely, parameterised query
  - Prompt injection in title ("`Ignore all previous instructions`") → stored as plain text
  - Employee reading another's ticket → 404
  - Malformed JSON → 400
  - Missing/expired JWT → 401
- [ ] **5.5** Frontend: backend-down screen (`BackendDownPage`) — shown when API returns network error
- [ ] **5.6** Frontend: explicit empty states on every list ("No open tickets", "No dashboard data yet")
- [ ] **5.7** Audit: confirm no `dangerouslySetInnerHTML` in frontend codebase (`grep -r dangerouslySetInnerHTML frontend/src`)
- [ ] **5.8** Audit: confirm `.env` is in `.gitignore` and no secrets are in any committed file
- [ ] **5.9** Verify `docker compose up --build` from a clean state produces working app

### Pre-freeze checklist (verify each line)
- [ ] Employee can submit a ticket and see it under My tickets
- [ ] Tickets survive backend restart and browser refresh
- [ ] Queue shows open and urgent issues, filters work
- [ ] Every ticket shows its technician or "Unassigned"
- [ ] Status changes are saved, timestamped, visible to the employee
- [ ] Dashboard counts match direct DB queries
- [ ] Invalid, empty and unauthorized requests rejected without crashing
- [ ] Secrets come from .env, .env is git-ignored
- [ ] Fresh clone + .env.example + `docker compose up` works first time

---

## PHASE 6 — AI Layer
**Goal:** All AI features working with graceful fallback when API key is unset.

### Tasks (in priority order: A, B, G, C, D, F, E)

**A. Auto-triage**
- [ ] **6.1** Create `backend/src/ai/client.ts` (Anthropic SDK, 5s timeout, try/catch wrapper)
- [ ] **6.2** Create `backend/src/ai/schemas.ts` (Zod schemas for all AI responses)
- [ ] **6.3** Implement `POST /api/ai/triage`: prompt with delimiters, validate response, return `{ category, priority, confidence, reason }` or `{ aiUnavailable: true }`
- [ ] **6.4** Frontend: show triage result as suggestion chip on `NewTicketPage`; employee can accept or ignore

**B. Duplicate Detection**
- [ ] **6.5** Implement `POST /api/ai/similar`: FTS + trigram search for top-3 similar open/resolved tickets; apply employee privacy filter
- [ ] **6.6** Frontend: show "Similar issues found" panel before submit

**G. SLA Risk** *(already computed in Phase 3 — verify it appears correctly)*
- [ ] **6.7** Verify SLA badges "At risk" and "Breached" appear correctly in queue and detail pages

**C. Hybrid Search**
- [ ] **6.8** Ensure `q` parameter uses both `ts_rank` and `similarity()` in `GET /api/tickets`
- [ ] **6.9** If `EMBEDDINGS_PROVIDER != none`: add pgvector column, embedding generation on ticket create, RRF merge in search (gate behind env check)

**D. Smart Assignment**
- [ ] **6.10** Implement `GET /api/ai/recommend-assignee/:ticketId`: score technicians by category match + workload; return ranked list
- [ ] **6.11** Frontend: show "Recommended" label on top-ranked technician in assign dropdown

**F. NL Dashboard Query**
- [ ] **6.12** Implement `POST /api/ai/ask`: generate SQL → validate (node-sql-parser, whitelist, LIMIT) → execute on read-only role → return `{ answer, sql }`
- [ ] **6.13** Frontend: NL question box on `DashboardPage`; show answer + generated SQL

**E. Ticket Summary and Draft Reply**
- [ ] **6.14** Implement summary + draft reply generation (single AI call, structured output)
- [ ] **6.15** Frontend: "Generate summary" button on ticket detail; editable draft reply area

### Verification
- Run all AI features with `ANTHROPIC_API_KEY` unset → every feature returns `{ aiUnavailable: true }` or graceful empty state; no 500 errors
- Prompt-injection text in ticket title/description → model ignores it, correct triage returned

---

## PHASE 7 — Stretch and Polish
**Goal:** Comments, notifications, polished UX, performance measurement.

### Tasks

- [ ] **7.1** Implement `POST /api/tickets/:id/comments` and `GET` (already returned in ticket detail)
- [ ] **7.2** Frontend: `CommentList` + `CommentForm` on `TicketDetailPage`
- [ ] **7.3** Implement in-app notification creation (on assignment + status change) — `POST` to `notifications` table via service layer
- [ ] **7.4** Frontend: `NotificationsBell` icon in navbar; badge with unread count; dropdown list; mark-as-read via `PATCH /api/notifications/:id/read`
- [ ] **7.5** Polish: loading skeletons on all list/detail pages; keyboard navigation; visible focus rings; dark/light mode toggle
- [ ] **7.6** Performance script: `backend/scripts/perf.ts` — seed 500 tickets, run 20 concurrent `GET /api/tickets` requests, measure p95 latency; output to `perf-results.json`
- [ ] **7.7** Add `npm run perf` script; run and record result in REPORT.md

### Verification
- p95 ≤ 300 ms at 500 tickets (record actual number)
- Dark/light mode toggle works without page reload
- Notifications appear in bell after status change via SSE

---

## PHASE 8 — Documentation
**Goal:** Complete README.md and REPORT.md with real results.

### Tasks

- [ ] **8.1** Complete `README.md`: architecture overview (mermaid), quick start (one command), demo accounts table, env vars reference, seed commands, test commands
- [ ] **8.2** Write `REPORT.md` sections 1–7 with real test output from Phases 3–7:
  - Architecture mermaid diagram
  - What works / what doesn't
  - Ticket logic enforcement table (frontend / backend / DB)
  - Auth and role approach
  - Dashboard SQL for each metric
  - Scenario test table (≥ 6 real scenarios with actual results)
  - Planned vs actual per phase
  - One dead end and why it was abandoned
  - Limitations and next steps
  - How to run (exact steps from a fresh machine)
- [ ] **8.3** Run full pre-freeze checklist one final time; update pass/fail in REPORT.md
- [ ] **8.4** Final `docker compose up --build` from a clean state — verify everything starts and seed data is present

---

## APPENDIX: ENV VARS REFERENCE

| Variable              | Required | Default   | Description                                   |
|-----------------------|----------|-----------|-----------------------------------------------|
| `DATABASE_URL`        | yes      | —         | Postgres connection string                    |
| `DIRECT_URL`          | no       | —         | Prisma direct URL (for migrations via pool)   |
| `JWT_SECRET`          | yes      | —         | HS256 signing secret (≥ 32 chars)             |
| `FRONTEND_URL`        | yes      | —         | CORS allowed origin (e.g. http://localhost:5173) |
| `SEED_PASSWORD`       | yes      | —         | Password for all seeded demo accounts         |
| `ANTHROPIC_API_KEY`   | no       | —         | Claude API key; AI features degrade if unset  |
| `AI_MODEL`            | no       | claude-3-5-haiku-20241022 | Claude model name         |
| `EMBEDDINGS_PROVIDER` | no       | none      | `none` \| `openai` \| `local`                 |
| `SLA_URGENT_HOURS`    | no       | 4         | SLA target for urgent tickets                 |
| `SLA_HIGH_HOURS`      | no       | 8         | SLA target for high tickets                   |
| `SLA_MEDIUM_HOURS`    | no       | 24        | SLA target for medium tickets                 |
| `SLA_LOW_HOURS`       | no       | 72        | SLA target for low tickets                    |
| `NODE_ENV`            | no       | production | `development` enables demo accounts panel   |
| `PORT`                | no       | 4000      | Backend HTTP port                             |
| `READONLY_DATABASE_URL` | no    | —         | Connection for helpdesk_readonly role (NL queries) |
