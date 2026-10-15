# HelpDesk 360

AI-assisted IT support ticketing platform — **IT HAPPENS @ RAALE #12** hackathon.

---

## Quick start (one command)

```bash
git clone https://github.com/MYTHILEESHWARAN/Help-Desk.git
cd Help-Desk
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/api/health |
| PostgreSQL | localhost:5432 |

The defaults in `.env.example` work out of the box — no manual edits required.

---

## Demo accounts

Password for all accounts: value of `SEED_PASSWORD` (default: `Demo1234!`)

| Username | Role | Access |
|----------|------|--------|
| `arjun.mehta` | Technician | Queue, dashboard, assign, status |
| `kavya.reddy` | Technician | Queue, dashboard, assign, status |
| `priya.nair` | Employee | Own tickets only |
| `rahul.verma` | Employee | Own tickets only |
| `sneha.iyer` | Employee | Own tickets only |

---

## Architecture

```
Browser (React 18 + Vite, port 5173)
    │  HTTP + httpOnly JWT cookie
    │  EventSource SSE (/api/events)
    ▼
Express API (Node 20, port 4000)
    │  Prisma ORM (parameterised queries)
    ▼
PostgreSQL 16 (pg_trgm, GIN FTS + trigram indexes)
    └── Optional: Anthropic Claude API (graceful fallback if key not set)
```

---

## Environment variables

See `.env.example` for the complete list. Key variables:

| Variable | Docker default | Description |
|----------|---------------|-------------|
| `DATABASE_URL` | `postgresql://helpdesk:helpdesk_password@db:5432/helpdesk?schema=public` | Postgres (host=`db` inside Docker) |
| `JWT_SECRET` | `helpdesk360_dev_jwt_secret_minimum32chars!!` | HS256 key (min 32 chars) |
| `SEED_PASSWORD` | `Demo1234!` | Password for all seeded accounts |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `VITE_API_URL` | `http://backend:4000` | Vite proxy target — **must be `http://backend:4000` in Docker** |
| `ANTHROPIC_API_KEY` | _(empty)_ | Optional — leave blank, AI degrades gracefully |
| `LOG_LEVEL` | `info` | pino log level |

---

## Seed commands

```bash
# Run inside the backend container:
docker compose exec backend npm run seed:small    # 5 sample tickets
docker compose exec backend npm run seed:large    # 30+ tickets (all statuses/priorities)
docker compose exec backend npm run seed:hostile  # Edge-case tickets — dev only
```

---

## Running tests

```bash
cd backend
npm test
# Expected: 5 test files, 75 tests, 0 failing
```

---

## Separate local dev run (without Docker)

Requires Postgres running on localhost:5432.

**Terminal 1 — DB only:**
```bash
docker compose up db -d
```

**Terminal 2 — Backend:**
```bash
cd backend
cp ../.env.example .env
# Edit .env: change DATABASE_URL host from @db: to @localhost:
# Also set VITE_API_URL=http://localhost:4000
npx prisma migrate deploy
npm run dev
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router |
| Backend | Node 20, Express, TypeScript, Zod, Prisma ORM, bcrypt, JWT |
| Database | PostgreSQL 16, pg_trgm, GIN indexes, updated_at trigger |
| AI | Anthropic Claude (optional, 5s timeout, graceful fallback) |
| Live updates | Server-Sent Events |

---

See [REPORT.md](./REPORT.md) for the hackathon report.
See [docs/test-evidence.md](./docs/test-evidence.md) for all verification outputs.
