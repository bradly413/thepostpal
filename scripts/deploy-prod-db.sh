#!/usr/bin/env bash
#
# deploy-prod-db.sh — apply Prisma migrations (incl. RLS policies) to a
# PRODUCTION Postgres database, safely.
#
# Usage:
#   ./scripts/deploy-prod-db.sh "postgresql://user:pass@host:5432/db?sslmode=require"
#   # or:
#   PROD_DATABASE_URL="postgresql://..." ./scripts/deploy-prod-db.sh
#
# What it does:
#   1. Refuses to run against the local dev DB (posterboy_rls_dev) or localhost.
#   2. Shows pending migrations and asks for confirmation.
#   3. Runs `prisma migrate deploy` (NEVER `migrate dev`/`reset` — no data loss).
#   4. Verifies the RLS multi-tenant migration is recorded.
#
# Run AFTER setting DATABASE_URL on Vercel production. This applies the same
# schema + RLS policies your prod app expects.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

URL="${1:-${PROD_DATABASE_URL:-}}"
if [[ -z "$URL" ]]; then
  echo "✗ No connection string. Pass it as an argument or set PROD_DATABASE_URL." >&2
  echo "  ./scripts/deploy-prod-db.sh \"postgresql://...\"" >&2
  exit 1
fi

# --- Safety guards -----------------------------------------------------------
if [[ "$URL" == *"posterboy_rls_dev"* ]]; then
  echo "✗ Refusing to run: that's the LOCAL dev database (posterboy_rls_dev)." >&2
  echo "  Use 'npx prisma migrate dev' for local work." >&2
  exit 1
fi
if [[ "$URL" == *"127.0.0.1"* || "$URL" == *"localhost"* ]]; then
  echo "✗ Refusing to run against localhost. This script is for a hosted prod DB." >&2
  exit 1
fi

# Mask credentials when echoing the target.
MASKED="$(printf '%s' "$URL" | sed -E 's#(://[^:]+:)[^@]+@#\1****@#')"
echo "Target database: $MASKED"
echo ""
echo "Pending migration status:"
DATABASE_URL="$URL" npx prisma migrate status || true
echo ""

read -r -p "Apply 'prisma migrate deploy' to the above database? [y/N] " ans
if [[ "${ans:-}" != "y" && "${ans:-}" != "Y" ]]; then
  echo "Aborted. Nothing was applied."
  exit 0
fi

echo ""
echo "→ Applying migrations…"
DATABASE_URL="$URL" npx prisma migrate deploy

echo ""
echo "→ Verifying RLS migration is recorded…"
if DATABASE_URL="$URL" npx prisma migrate status | grep -q "20260602193000_enable_rls_multi_tenant"; then
  echo "✓ RLS multi-tenant migration present."
else
  echo "⚠ Could not confirm the RLS migration by name — review 'prisma migrate status' output above."
fi

echo ""
echo "✓ Done. Prod DB schema is in sync. Next: verify the Tier-1 env vars (docs/PROD-ENV-CHECKLIST.md), then merge to main."
