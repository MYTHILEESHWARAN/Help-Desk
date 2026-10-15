# HelpDesk 360 — Requirements (EARS-style Acceptance Criteria)

> Format: **WHEN** [trigger] **THE SYSTEM SHALL** [behavior] / **WHERE** [context] **THE SYSTEM SHALL** [behavior] / **THE SYSTEM SHALL** [behavior] (ubiquitous)

---

## 1. PERSISTENCE

- **REQ-P01** — THE SYSTEM SHALL write every ticket, assignment change, and status change to the PostgreSQL database before the HTTP response is sent to the client.
- **REQ-P02** — WHEN the backend container is restarted, THE SYSTEM SHALL serve the same ticket data that existed before the restart without any data loss.
- **REQ-P03** — THE SYSTEM SHALL NOT hold authoritative application state in browser localStorage, sessionStorage, in-memory arrays, or any server-side global variable.
- **REQ-P04** — THE SYSTEM SHALL set `created_at` and `updated_at` timestamps on the database server in UTC; browser-supplied timestamps SHALL be rejected.
- **REQ-P05** — THE SYSTEM SHALL update `tickets.updated_at` atomically in the same database transaction as every status change and assignment change.

---

## 2. HONEST DATA DISPLAY

- **REQ-D01** — WHERE the database contains no tickets matching a query, THE SYSTEM SHALL display an explicit empty-state message (e.g., "No open issues") instead of fabricated data.
- **REQ-D02** — THE SYSTEM SHALL derive every count, chart value, and status badge from a live SQL query; no value SHALL be hard-coded or cached beyond the TanStack Query stale time.
- **REQ-D03** — THE SYSTEM SHALL expose, on every dashboard widget, a "Show query" toggle that renders the exact SQL string, the tables used, and the active filter parameters that produced the displayed number.

---

## 3. SERVER-SIDE ENFORCEMENT

- **REQ-E01** — THE SYSTEM SHALL validate all incoming request payloads on the backend using Zod schemas; invalid input SHALL return HTTP 400 with a JSON body containing a `message` field.
- **REQ-E02** — THE SYSTEM SHALL enforce role permissions on the backend; forbidden actions SHALL return HTTP 403 with a JSON `message`; missing or invalid JWT SHALL return HTTP 401.
- **REQ-E03** — THE SYSTEM SHALL enforce the status state machine on the backend; illegal status transitions SHALL return HTTP 400 naming the allowed next states.
- **REQ-E04** — THE SYSTEM SHALL never crash (return 5xx without recovery) on malformed JSON, oversized payloads, or missing fields; it SHALL return a structured 400 or 422 instead.
- **REQ-E05** — THE SYSTEM SHALL reject a `description` longer than 5000 characters with HTTP 400.
- **REQ-E06** — THE SYSTEM SHALL reject a `title` shorter than 1 or longer than 120 characters with HTTP 400.
- **REQ-E07** — THE SYSTEM SHALL reject unknown enum values for `category`, `priority`, and `status` with HTTP 400.

---

## 4. AUTHENTICATION AND AUTHORISATION

- **REQ-A01** — THE SYSTEM SHALL authenticate users via `POST /api/auth/login` with username + password; successful login SHALL set an httpOnly, sameSite=lax JWT cookie; no registration endpoint is exposed.
- **REQ-A02** — THE SYSTEM SHALL hash all stored passwords with bcrypt (minimum cost factor 10).
- **REQ-A03** — THE SYSTEM SHALL rate-limit the login endpoint to 5 attempts per minute per IP; excess attempts SHALL return HTTP 429.
- **REQ-A04** — WHEN an employee requests a ticket whose `reported_by` is not themselves, THE SYSTEM SHALL return HTTP 404 (treating it as non-existent to avoid information leakage).
- **REQ-A05** — WHEN an employee calls `PATCH /api/tickets/:id/status` or `PATCH /api/tickets/:id/assign`, THE SYSTEM SHALL return HTTP 403.
- **REQ-A06** — THE SYSTEM SHALL expose `GET /api/auth/me` returning the authenticated user's id, username, full_name, email, and role.
- **REQ-A07** — THE SYSTEM SHALL expose `POST /api/auth/logout` that clears the JWT cookie.

---

## 5. TICKET LIFECYCLE

- **REQ-T01** — WHEN an employee submits a ticket, THE SYSTEM SHALL accept `title` (1–120 chars), `description` (1–5000 chars), `category` (enum), and `priority` (enum); all four fields are required.
- **REQ-T02** — THE SYSTEM SHALL accept an optional `Idempotency-Key` header on `POST /api/tickets`; if the same key is received a second time, THE SYSTEM SHALL return the existing ticket (HTTP 200) without creating a duplicate.
- **REQ-T03** — THE SYSTEM SHALL set new tickets to status `open` regardless of any status value supplied by the client.
- **REQ-T04** — THE SYSTEM SHALL store `<script>` tags and SQL-like text as plain text; it SHALL never execute or evaluate submitted content; all output SHALL be HTML-escaped.
- **REQ-T05** — THE SYSTEM SHALL write a `status_history` row with `event_type = created` when a ticket is created, recording `to_status = open`, `changed_by = reporter`, and `changed_at` in UTC.

### Status State Machine

- **REQ-SM01** — THE SYSTEM SHALL permit only these status transitions: `open → in-progress`, `in-progress → resolved`, `resolved → closed`, `resolved → in-progress`.
- **REQ-SM02** — WHEN a technician resolves or closes a ticket that has no assignee, THE SYSTEM SHALL automatically assign it to the acting technician before persisting the status change.
- **REQ-SM03** — THE SYSTEM SHALL write a `status_history` row for every status change, recording `event_type = status_change`, `from_status`, `to_status`, `changed_by`, `note` (optional), and `changed_at`.
- **REQ-SM04** — THE SYSTEM SHALL write a `status_history` row for every assignment change, recording `event_type = assignment`, `changed_by`, and `changed_at`.

---

## 6. TECHNICIAN OPERATIONS

- **REQ-TC01** — THE SYSTEM SHALL allow a technician to view all tickets regardless of reporter.
- **REQ-TC02** — THE SYSTEM SHALL allow filtering tickets by `status`, `priority`, `category`, `assigned_to` (user id or the literal string `"unassigned"`), and free-text search `q`.
- **REQ-TC03** — THE SYSTEM SHALL sort the default ticket list urgent-first, then high, medium, low, then oldest `created_at` first.
- **REQ-TC04** — THE SYSTEM SHALL allow a technician to assign or reassign a ticket; the assignee must exist and have `role = technician`; assigning to a non-technician SHALL return HTTP 400.
- **REQ-TC05** — THE SYSTEM SHALL allow sorting by `priority`, `created_at`, and `updated_at` with `asc`/`desc` order.
- **REQ-TC06** — THE SYSTEM SHALL paginate ticket lists; `pageSize` defaults to 20 and is capped at 100; response includes `total`, `page`, `pageSize`.

---

## 7. DASHBOARD

- **REQ-DB01** — THE SYSTEM SHALL expose `GET /api/dashboard` (technician only) returning: open count, urgent-open count, unassigned count, in-progress count, completed count, tickets-per-technician (with open load), breakdown by status/priority/category, and average resolution time.
- **REQ-DB02** — Each metric in the dashboard response SHALL include a `sql` field containing the exact query used to compute it.
- **REQ-DB03** — WHERE the database is empty, THE SYSTEM SHALL return all dashboard counts as `0` and charts as empty arrays.

---

## 8. LIVE UPDATES (SSE)

- **REQ-SSE01** — THE SYSTEM SHALL expose `GET /api/events` as a Server-Sent Events endpoint.
- **REQ-SSE02** — WHEN a ticket is created, updated, or assigned, THE SYSTEM SHALL push an event on the SSE stream filtered by role: employees receive events only for their own tickets; technicians receive all events.
- **REQ-SSE03** — WHEN the SSE connection is dropped, THE SYSTEM SHALL allow the client to reconnect and resume without server error.

---

## 9. SLA

- **REQ-SLA01** — THE SYSTEM SHALL compute server-side for every ticket: time elapsed vs. target resolution time (urgent 4h, high 8h, medium 24h, low 72h; configurable via env).
- **REQ-SLA02** — THE SYSTEM SHALL label a ticket "At risk" when more than 75% of its SLA has elapsed, and "Breached" when 100% has elapsed; these labels SHALL be included in ticket responses.
- **REQ-SLA03** — THE SYSTEM SHALL use `tickets.created_at` as the SLA start time unless the ticket is `resolved` or `closed`, in which case no badge is shown.

---

## 10. AI FEATURES

- **REQ-AI01** — THE SYSTEM SHALL call the Anthropic Claude API only from the backend; the API key SHALL never appear in frontend code or HTTP responses.
- **REQ-AI02** — WHEN an AI call times out or returns an error, THE SYSTEM SHALL respond to the client with a degraded payload (e.g., `{ "aiUnavailable": true }`) and SHALL NOT block the write operation.
- **REQ-AI03** — THE SYSTEM SHALL enforce a 5-second timeout on every AI API call.
- **REQ-AI04** — THE SYSTEM SHALL validate AI-returned `category` and `priority` values against the fixed Zod enums before storing or returning them; out-of-range values SHALL be discarded.
- **REQ-AI05** — THE SYSTEM SHALL wrap ticket content inside delimiters in every prompt and instruct the model to ignore instructions found within the delimiters (prompt-injection defence).

### A. Auto-triage

- **REQ-AI-A01** — THE SYSTEM SHALL expose `POST /api/ai/triage` accepting `{ title, description }` and returning `{ category, priority, confidence, reason }`.
- **REQ-AI-A02** — THE SYSTEM SHALL store the triage result in `tickets.ai_suggested_category` and `tickets.ai_suggested_priority` for audit; these fields SHALL NOT override the employee's final choice.

### B. Duplicate Detection

- **REQ-AI-B01** — THE SYSTEM SHALL expose `POST /api/ai/similar` accepting `{ title, description }` and returning up to 3 similar tickets.
- **REQ-AI-B02** — WHERE the caller is an employee, THE SYSTEM SHALL return only `id`, `title`, `status`, and `resolution_note` (if resolved) — never details of other employees' tickets.
- **REQ-AI-B03** — WHERE the caller is a technician, THE SYSTEM SHALL return the full ticket summary.

### C. Hybrid Search

- **REQ-AI-C01** — THE SYSTEM SHALL use Postgres full-text search and `pg_trgm` trigram similarity for the `q` parameter by default.
- **REQ-AI-C02** — WHERE `EMBEDDINGS_PROVIDER` is not `"none"`, THE SYSTEM SHALL merge vector similarity results using reciprocal rank fusion.

### D. Smart Assignment

- **REQ-AI-D01** — THE SYSTEM SHALL expose `GET /api/ai/recommend-assignee/:ticketId` returning a ranked list of technicians scored by category match (from resolved ticket history) and current open-ticket workload.
- **REQ-AI-D02** — THE SYSTEM SHALL present the recommendation as a suggestion only; the technician must confirm the assignment.

### E. Ticket Summary and Draft Reply

- **REQ-AI-E01** — THE SYSTEM SHALL expose a mechanism (inline on the ticket detail page) to generate a 1–2 sentence summary and a draft resolution reply for long tickets.
- **REQ-AI-E02** — The draft reply SHALL be editable before posting.

### F. Natural-Language Dashboard Queries

- **REQ-AI-F01** — THE SYSTEM SHALL expose `POST /api/ai/ask` (technician only) accepting `{ question }` and returning `{ answer, sql }`.
- **REQ-AI-F02** — THE SYSTEM SHALL validate the AI-generated SQL: single SELECT statement, only whitelisted tables/columns, LIMIT enforced, executed against a read-only DB role with `statement_timeout = 2s`; any violation SHALL return HTTP 400.

### G. SLA Risk (no AI call required)

*Covered by REQ-SLA01–03 above.*

---

## 11. SECURITY

- **REQ-SEC01** — THE SYSTEM SHALL apply `helmet` middleware on all responses.
- **REQ-SEC02** — THE SYSTEM SHALL restrict CORS to the frontend origin (from env `FRONTEND_URL`).
- **REQ-SEC03** — THE SYSTEM SHALL rate-limit AI endpoints.
- **REQ-SEC04** — THE SYSTEM SHALL use parameterised queries only (via Prisma); no string-interpolated SQL except in the read-only NL-query feature, where the query is validated and run via a separate read-only DB role.
- **REQ-SEC05** — THE SYSTEM SHALL never use `dangerouslySetInnerHTML` in the frontend.
- **REQ-SEC06** — ALL secrets (DB URL, JWT secret, Anthropic key, seed password) SHALL be read from environment variables; `.env` SHALL be git-ignored; `.env.example` SHALL be committed with placeholder values.

---

## 12. PACKAGING AND REPEATABILITY

- **REQ-PKG01** — THE SYSTEM SHALL include a `docker-compose.yml` with services `db`, `backend`, `frontend`; a named volume for Postgres data; and a health-check on the db service.
- **REQ-PKG02** — The backend service SHALL wait for the db health-check before starting, then run Prisma migrations and the idempotent seed script automatically.
- **REQ-PKG03** — Running `docker compose up --build` on a fresh clone with a copied `.env.example` SHALL produce a fully working application with no manual steps.
- **REQ-PKG04** — THE SYSTEM SHALL expose `GET /api/health` returning `{ status: "ok", timestamp }` without requiring authentication.

---

## 13. SEED DATA

- **REQ-SD01** — THE SYSTEM SHALL ship an idempotent seed script that creates 5 demo users (3 employees, 2 technicians) using passwords from `SEED_PASSWORD` env var.
- **REQ-SD02** — `npm run seed:small` SHALL load 5 sample tickets across categories and statuses.
- **REQ-SD03** — `npm run seed:large` SHALL load 25+ tickets across all 4 categories, all 4 priorities, all 4 statuses, with realistic `status_history` rows.
- **REQ-SD04** — `npm run seed:hostile` SHALL load edge-case tickets (XSS attempts, oversized strings, SQL injection patterns) for manual testing only; it SHALL NOT run automatically.
- **REQ-SD05** — Re-running any seed script SHALL be idempotent (no duplicate rows).

---

## 14. PERFORMANCE

- **REQ-PERF01** — `GET /api/tickets` with 500 tickets in the database SHALL respond at p95 ≤ 300 ms, measured by a dedicated script recorded in REPORT.md.

---

## 15. FRONTEND UX

- **REQ-UX01** — THE SYSTEM SHALL display loading skeletons while data is fetching.
- **REQ-UX02** — THE SYSTEM SHALL display error toasts for failed API calls.
- **REQ-UX03** — THE SYSTEM SHALL show a backend-down screen with a clear message when the API is unreachable.
- **REQ-UX04** — THE SYSTEM SHALL use colour AND text/icon to convey priority and status (never colour alone, for accessibility).
- **REQ-UX05** — Urgent tickets SHALL display a red badge and appear pinned at the top of the queue.
- **REQ-UX06** — THE SYSTEM SHALL support dark and light mode.
- **REQ-UX07** — THE SYSTEM SHALL show a "demo accounts" hint panel on the login page in development mode.
- **REQ-UX08** — THE SYSTEM SHALL disable the Submit button while a ticket creation request is pending.
- **REQ-UX09** — WHEN ticket creation succeeds, THE SYSTEM SHALL show a confirmation with the ticket ID and redirect to "My tickets".
- **REQ-UX10** — THE SYSTEM SHALL provide keyboard navigation and visible focus states on all interactive elements (WCAG 2.1 AA target).
- **REQ-UX11** — Character counters SHALL be shown live on the `title` and `description` fields.
- **REQ-UX12** — The frontend ticket form SHALL mirror server-side validation rules client-side (same length limits and enum values) to give instant feedback, while the server remains the authoritative validator.
