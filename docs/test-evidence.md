# HelpDesk 360 — Test Evidence
*Generated during integration audit — all commands and outputs are real.*

---

## STEP 1: Audit Results

### Phase Checklist (inspected from code, not from checkboxes)

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 0 | Repo layout, .gitignore, .env.example | ? DONE | |
| 0 | docker-compose.yml with 3 services, healthcheck, named volume | ? DONE | |
| 0 | backend/Dockerfile (multi-stage, node:20-alpine) | ? DONE | |
| 0 | frontend/Dockerfile (Vite dev, 0.0.0.0) | ? DONE | |
| 0 | GET /api/health endpoint | ? DONE | |
| 0 | Steering files in .kiro/steering/ | ? DONE | |
| 1 | POST /api/tickets with idempotency key | ? DONE | |
| 1 | GET /api/tickets (filter/sort/pagination) | ? DONE | |
| 1 | GET /api/tickets/:id | ? DONE | |
| 1 | Prisma schema + migration SQL | ? DONE | pg_trgm, GIN FTS, trgm indexes |
| 1 | Idempotent seed.ts (small/large/hostile) | ? DONE | |
| 1 | Frontend: NewTicketPage, MyTicketsPage, TicketDetailPage | ? DONE | |
| 2 | Auth: POST /login, /logout, GET /me | ? DONE | httpOnly+sameSite=lax cookie |
| 2 | bcrypt cost 12, JWT HS256 8h | ? DONE | |
| 2 | requireRole middleware | ? DONE | |
| 2 | GET /api/users?role=technician | ? DONE | |
| 2 | ForbiddenPage, 403 route | ? DONE | |
| 3 | Status state machine ALLOWED_TRANSITIONS | ? DONE | |
| 3 | PATCH /status, PATCH /assign | ? DONE | |
| 3 | SLA computation (computeSla) | ? DONE | |
| 3 | QueuePage (filter bar, assign dropdown, status buttons) | ? DONE | |
| 4 | GET /api/dashboard (8 SQL metrics + sql strings) | ? DONE | |
| 4 | DashboardPage with charts + Show Query toggles | ? DONE | |
| 4 | GET /api/events (SSE) | ? DONE | |
| 4 | useSSE hook + Layout integration | ? DONE | |
| 5 | Hostile-input test suite (12 tests) | ? DONE | |
| 5 | SyntaxError ? 400 in errorHandler | ? DONE | |
| 6 | AI client wrapper (5s timeout, graceful fallback) | ? DONE | |
| 6 | POST /api/ai/triage, /similar, /recommend-assignee | ? DONE | |
| 6 | POST /api/ai/ask (NL query, whitelisted tables) | ? DONE | |
| 6 | AI routes mounted in index.ts | ? DONE | (was missing, fixed) |
| 7 | Notifications (create on assign/status, GET/PATCH) | ? DONE | |
| 7 | NotificationsBell component in Layout | ? DONE | |
| 7 | perf.ts script | ? DONE | |
| 8 | REPORT.md | ? DONE | |

### Integration Risks Identified

| Risk | Severity | Status | Fix Applied |
|------|----------|--------|-------------|
| VITE_API_URL=http://localhost:4000 in Docker ? browser hits host not container | HIGH | FIXED | Changed docker-compose default to http://backend:4000 |
| AI and Notifications routes imported but not mounted in index.ts | HIGH | FIXED | Added app.use lines in index.ts |
| LOG_LEVEL missing from .env.example | LOW | FIXED | Added to .env.example and docker-compose.yml |
| JWT_SECRET placeholder too short in .env.example | MEDIUM | FIXED | Updated to 40-char demo value |
| dist/index.js vs dist/src/index.js (rootDir mismatch) | HIGH | FIXED | package.json + entrypoint updated |
| moduleResolution deprecation warning in tsconfig | LOW | FIXED | Removed explicit moduleResolution |
| Employee reads other ticket ? rule says 404 (steering) | CONFIRMED | NO CHANGE | Code + tests already correct |
| dangerouslySetInnerHTML | NONE | N/A | grep confirms absent |

---

## STEP 2: Service Connection Verification

### Command: `npm test` (backend, 2025-10-16)

```
Tests  75 passed (75)
Test Files  5 passed (5)
Duration  3.08s
```

**Result: PASS — 75/75 tests**

### Command: `npx tsc --noEmit` (backend)
```
Exit Code: 0 (no output = no errors)
```

### Command: `npx tsc --noEmit` (frontend)
```
Exit Code: 0 (no output = no errors)
```

---

## STEP 3: Core Flow (requires running Docker)

**Status: Docker not available in this environment.**
The following scenarios are verified via the Supertest test suite instead.

### Scenario 1: Ticket creation ? DB persistence
- **Verified by**: `validation.test.ts > POST /api/tickets > allows account-access category ? 201`
- **DB persistence**: Each ticket create calls `prisma.$transaction` which writes BEFORE the response

### Scenario 2: Idempotency (double-submit)
- **Verified by**: `validation.test.ts > POST /api/tickets > idempotency key returns 200/201`
- **Code path**: `createTicket` checks `findUnique({ where: { idempotency_key }})` before inserting

### Scenario 3: Restart persistence
- **Architecture proof**: All writes committed to Postgres (pgdata named volume) before API responds

### Scenario 4: Status transitions (technician)
- **Verified by**: `validation.test.ts > state machine` (8 transition tests)
- open?in-progress: 200 ?
- open?resolved: 400 "Allowed next states: in-progress" ?
- resolved?in-progress: 200 (reopen) ?
- resolved?closed: 200 ?

### Scenario 5: Auto-assign on resolve
- **Verified by**: `validation.test.ts > auto-assigns to actor when resolving with no assignee ? 200`

### Scenario 6: SLA badges
- **Verified by**: `tickets.unit.test.ts > SLA computation` (5 tests)
- ok < 75%: label="ok" ?
- at-risk = 75%: label="at-risk" ?
- breached = 100%: label="breached" ?

---

## STEP 4: Validation & Hostile Input

### Full test run output:
```
Test Files  5 passed (5)
Tests  75 passed (75)

auth.test.ts (18 tests):
  POST /api/auth/login - returns 200 for correct credentials
  POST /api/auth/login - returns 401 for unknown username
  POST /api/auth/login - returns 401 for wrong password
  POST /api/auth/login - returns 400 for missing username/password/empty body
  GET /api/auth/me - returns 401 for no/malformed token
  GET /api/auth/me - returns 200 for valid token
  PATCH /api/tickets/:id/status - returns 403 for employee
  PATCH /api/tickets/:id/assign - returns 403 for employee
  GET /api/users - returns 401/403 for unauthenticated/employee
  GET /api/users - returns 200 for technician
  POST /api/auth/logout - clears cookie
  Malformed JSON - returns 400

validation.test.ts (26 tests):
  POST /api/tickets - empty title ? 400
  POST /api/tickets - title 121 chars ? 400
  POST /api/tickets - empty description ? 400
  POST /api/tickets - description 5001 chars ? 400
  POST /api/tickets - invalid category enum ? 400
  POST /api/tickets - invalid priority enum ? 400
  POST /api/tickets - missing fields ? 400
  POST /api/tickets - account-access valid ? 201
  POST /api/tickets - idempotency key ? 200/201
  PATCH status - open?in-progress ? 200
  PATCH status - open?resolved ? 400 (with allowed states)
  PATCH status - open?closed ? 400
  PATCH status - in-progress?resolved ? 200
  PATCH status - resolved?in-progress (reopen) ? 200
  PATCH status - resolved?closed ? 200
  PATCH status - invalid enum ? 400
  PATCH status - auto-assigns on resolve with no assignee ? 200
  PATCH assign - non-existent user ? 400
  PATCH assign - employee as assignee ? 400
  PATCH assign - valid technician ? 200
  PATCH assign - unassign null ? 200
  PATCH assign - invalid UUID ? 400
  Employee reads other ticket ? 404
  Ticket owner reads own ticket ? 200
  Malformed JSON on POST tickets ? 400
  Malformed JSON on PATCH status ? 400

hostile.test.ts (12 tests):
  Empty title ? 400
  Title 121 chars ? 400
  Description 5001 chars ? 400
  XSS title ? 201 (stored as text, response is application/json)
  SQL injection description ? 201 (parameterised query, stored safely)
  Prompt injection title ? 201 (stored as plain text)
  Missing JWT ? 401
  Malformed JSON ? 400
  Unknown enum category ? 400
  Employee calls GET /api/dashboard ? 403
  Title 120 chars (boundary) ? 201
  Description 5000 chars (boundary) ? 201
```

### Security audit:
- `dangerouslySetInnerHTML`: **grep found 0 matches** ?
- Parameterised queries only (Prisma): confirmed ?
- httpOnly+sameSite=lax cookie: confirmed in auth.ts:59-60 ?
- Bcrypt cost 12: confirmed in seed.ts:13 (`BCRYPT_COST = 12`) ?
- Rate limit login 5/min (1000 in test): confirmed in auth.ts:17 ?

---

## STEP 5: AI Layer

- With `ANTHROPIC_API_KEY=` (empty): `callClaude` returns `AI_UNAVAILABLE` constant
- Routes: POST /api/ai/triage, /similar, /recommend-assignee/:id, /ask — all mounted
- Graceful degradation: each handler checks `if (raw === AI_UNAVAILABLE) return { aiUnavailable: true }`
- Ticket form: submit never blocked by AI (AI call is fire-and-forget suggestion)

---

## STEP 6: Fresh-Clone Readiness

**cp .env.example .env && docker compose up --build should:**
1. Start db with healthcheck ?
2. Backend waits for db healthy ? (depends_on condition)
3. Run `prisma migrate deploy` ? (entrypoint step 1)
4. Run `node dist/prisma/seed.js` ? (entrypoint step 2, compiled seed)
5. Start `node dist/src/index.js` ? (entrypoint step 3)
6. Frontend proxies /api ? http://backend:4000 ? (VITE_API_URL fixed)

**Cannot run `docker compose up` in this environment (Docker not available).**

---

## Bugs Found and Fixed

1. **VITE_API_URL pointed to localhost:4000 in Docker** ? Changed to `http://backend:4000`
2. **AI and Notifications routes not mounted** ? Added to index.ts
3. **LOG_LEVEL missing from .env.example** ? Added
4. **JWT_SECRET demo value too short** ? Updated to 40-char example
5. **moduleResolution deprecation warning** ? Removed explicit setting
6. **dist/index.js vs dist/src/index.js** ? Fixed package.json + entrypoint
