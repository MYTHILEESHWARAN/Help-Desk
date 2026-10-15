---
inclusion: always
---

# HelpDesk 360 — Tech Conventions

## Stack (do not introduce alternatives without justification)

### Frontend (`frontend/`)
- React 18 + Vite + TypeScript
- Tailwind CSS for styling
- shadcn/ui for UI components (do not install other component libraries)
- TanStack Query (`@tanstack/react-query`) for ALL data fetching — cache only, API is the source of truth
- React Router v6 for routing
- `EventSource` API for SSE

### Backend (`backend/`)
- Node 20 + Express + TypeScript
- Zod for ALL request validation (no manual `if` checks for field types)
- Prisma ORM with migrations — no raw SQL except: (a) pre-written dashboard queries and (b) validated NL queries on read-only role
- bcrypt (cost 12) for password hashing
- JWT (HS256, 8h expiry) stored in httpOnly + sameSite=lax cookie — NEVER in Authorization header or body
- helmet (all defaults)
- express-rate-limit
- pino for structured JSON logging
- Vitest + Supertest for backend tests

### Database
- PostgreSQL 16
- Extensions: `pg_trgm` (required), `pgvector` (optional, gated behind `EMBEDDINGS_PROVIDER` env)
- Roles: `helpdesk_app` (read/write), `helpdesk_readonly` (SELECT only, for NL queries)

### AI
- Anthropic Claude API — backend only, never called from frontend
- Model name from `AI_MODEL` env var
- All AI calls have a 5-second timeout and try/catch

## Code Style
- Prefer simple, readable code over clever abstractions.
- Add comments only where logic is non-obvious.
- Keep route handlers thin — business logic lives in `services/`.
- Zod schemas are the single source of truth for type shapes; derive TypeScript types from them (`z.infer<typeof Schema>`).
- Use `async/await`; avoid callback chains.
- Error responses always have shape `{ message: string }`.

## File Structure
```
backend/src/
  routes/         — Express routers
  middleware/     — auth, roles, errorHandler, validate
  services/       — business logic (ticket, auth, sla, sse, notification)
  ai/             — AI feature handlers + client wrapper
  prisma/         — generated client import
  __tests__/      — Vitest + Supertest tests

frontend/src/
  pages/          — route-level page components
  components/     — shared/reusable components
  hooks/          — custom React hooks (useSSE, useAuth, etc.)
  lib/            — API client, query keys, utils
  types/          — shared TypeScript types (derived from Zod or API shapes)
```

## Enums (must match DB)
```typescript
Category = "hardware" | "network" | "software" | "account-access"
Priority = "low" | "medium" | "high" | "urgent"
Status   = "open" | "in-progress" | "resolved" | "closed"
Role     = "employee" | "technician"
```

## Packaging
- `docker-compose.yml` is the canonical run method.
- Backend entrypoint: `npx prisma migrate deploy && npx ts-node prisma/seed.ts && node dist/index.js`
- Seed is idempotent — safe to run on every start.
- All secrets from env vars. `.env` is git-ignored. `.env.example` committed with placeholder values.
