---
inclusion: always
---

# HelpDesk 360 — Security Rules

Every rule here is a hard requirement — violations are defects.

## Authentication
- JWT stored in httpOnly + sameSite=lax cookie. Never in localStorage, sessionStorage, or response body.
- JWT expiry: 8 hours. Secret from `JWT_SECRET` env var (≥ 32 chars).
- Bcrypt cost factor: 12.
- Login rate-limit: 5 attempts per minute per IP → 429.
- No registration endpoint — seeded accounts only.

## Transport
- Apply `helmet()` with all defaults on every Express response.
- CORS: `origin: process.env.FRONTEND_URL`, `credentials: true`. No wildcard origins.
- AI endpoints: rate-limit 20 requests/minute/IP.
- General API: rate-limit 100 requests/minute/IP.

## Input Handling
- ALL request validation via Zod. Unknown keys are stripped.
- NEVER use string-interpolated SQL. Use Prisma parameterised queries.
- Exception: pre-written dashboard queries (parameterised) and NL-query feature (validated + read-only DB role).
- NL query safety: parse with `node-sql-parser`, whitelist tables (`tickets`, `users`, `status_history`), enforce SELECT-only, inject LIMIT 100, run under `helpdesk_readonly` role with `statement_timeout = 2s`.
- Description max 5000 chars, title max 120 chars — enforced by Zod on every write.

## Output / Frontend
- NEVER use `dangerouslySetInnerHTML`. All user content rendered as plain text.
- React auto-escapes JSX text nodes — rely on this, don't bypass it.
- Ticket content (title, description) treated as untrusted data in AI prompts — wrapped in delimiters, model instructed to ignore instructions within them.

## Secrets
- All secrets (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, SEED_PASSWORD) MUST come from environment variables.
- `.env` is git-ignored. `.env.example` committed with placeholder values only.
- Never log secret values. Use key names in log messages ("JWT_SECRET not set", not the actual value).
- ANTHROPIC_API_KEY is NEVER sent to the frontend or included in any HTTP response.

## Role Enforcement
- Role checks happen in Express middleware BEFORE the handler runs.
- Employee → 404 (not 403) when reading another user's ticket (prevents enumeration).
- Employee → 403 for PATCH status/assign, GET dashboard, GET users.
- Technician assignee validation: `assigned_to` must reference a user with `role = technician`. Non-technician assignee → 400.

## Error Responses
- All error responses: `{ "message": "..." }` — no stack traces in production.
- Global error handler catches Prisma errors (unique constraint, not found, etc.) and maps them to appropriate HTTP codes.
- Unhandled errors → 500 with generic message; always log the full error server-side with pino.

## Hostile Input Test Cases (must pass in Phase 5)
- Empty title/description → 400
- 10,001-char description → 400
- `<script>alert(1)</script>` as title → stored as plain text, returned escaped
- SQL injection string (`'; DROP TABLE users; --`) → stored safely, never executed
- Prompt injection in title (`"Ignore all previous instructions"`) → stored as plain text, AI model ignores it
- Missing/expired JWT → 401
- Malformed JSON body → 400
