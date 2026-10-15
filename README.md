# HelpDesk 360

AI-assisted IT support ticketing platform built for the **IT HAPPENS @ RAALE #12** hackathon.

## Quick start (one command)

```bash
# 1. Clone and configure
cp .env.example .env        # review and update secrets as needed

# 2. Start everything
docker compose up --build
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Health check**: http://localhost:4000/api/health

## Demo accounts

| Username       | Role       | Password (default) |
|----------------|------------|--------------------|
| `arjun.mehta`  | Technician | `Demo1234!`        |
| `kavya.reddy`  | Technician | `Demo1234!`        |
| `priya.nair`   | Employee   | `Demo1234!`        |
| `rahul.verma`  | Employee   | `Demo1234!`        |
| `sneha.iyer`   | Employee   | `Demo1234!`        |

> Password is set via the `SEED_PASSWORD` env var.

## Seed commands

```bash
# Run inside the backend container or with local Node 20
npm run seed:small    # 5 sample tickets
npm run seed:large    # 25+ tickets across all statuses/priorities
npm run seed:hostile  # edge-case tickets (XSS, SQL injection) — dev only
```

## Environment variables

See `.env.example` for a full list with descriptions.

Key variables:
- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — HS256 signing secret (≥ 32 chars)
- `SEED_PASSWORD` — password for all demo accounts
- `ANTHROPIC_API_KEY` — leave blank to run without AI features
- `FRONTEND_URL` — CORS allowed origin

## Tech stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router
- **Backend**: Node 20, Express, TypeScript, Zod, Prisma ORM, bcrypt, JWT
- **Database**: PostgreSQL 16 with `pg_trgm` extension
- **AI**: Anthropic Claude (optional, graceful fallback)
- **Live updates**: Server-Sent Events

## Running tests

```bash
cd backend
npm test
```

## Architecture

See `design.md` for the full architecture diagram and data model.

## Report

See `REPORT.md` for the hackathon submission report.
