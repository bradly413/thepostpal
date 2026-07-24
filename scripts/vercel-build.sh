#!/usr/bin/env bash

set -euo pipefail

npx prisma generate

if [[ "${VERCEL_ENV:-}" == "production" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Production build blocked: DATABASE_URL is unavailable." >&2
    exit 1
  fi

  echo "Applying pending production database migrations..."
  npx prisma migrate deploy
fi

npx next build
