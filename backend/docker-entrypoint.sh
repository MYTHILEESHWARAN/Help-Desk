#!/bin/sh
set -e

echo "-> Running Prisma migrations..."
npx prisma migrate deploy

echo "-> Running idempotent seed..."
node dist/prisma/seed.js 2>/dev/null || {
  echo "  (compiled seed not found, running via ts-node)"
  npx ts-node --transpile-only prisma/seed.ts
}

echo "-> Starting HelpDesk 360 backend on port ${PORT:-4000}..."
exec node dist/src/index.js
