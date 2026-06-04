#!/usr/bin/env bash
#
# Reads the Neon DIRECT connection string from the macOS clipboard and runs
# deploy-prod-db.sh non-interactively.
#
# In Neon Console (Chrome):
#   1. Open project "posterboy-prod"
#   2. Connect → Connection string → Direct (not pooled)
#   3. Copy the full postgresql://... URL
#   4. Run: ./scripts/deploy-prod-db-from-clipboard.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v pbpaste >/dev/null 2>&1; then
  echo "✗ pbpaste not found (macOS clipboard required)." >&2
  exit 1
fi

URL="$(pbpaste | tr -d '\n\r' | sed 's/^["'\'']//;s/["'\'']$//')"

if [[ ! "$URL" =~ ^postgresql:// ]]; then
  echo "✗ Clipboard does not contain a postgresql:// URL." >&2
  echo "  Copy the Neon DIRECT connection string, then run this script again." >&2
  exit 1
fi

if [[ "$URL" == *"-pooler"* ]]; then
  echo "⚠ Warning: URL looks like a POOLED host (-pooler). Migrations should use the DIRECT host." >&2
  read -r -p "Continue anyway? [y/N] " ans
  if [[ "${ans:-}" != "y" && "${ans:-}" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

export PROD_DATABASE_URL="$URL"
export DEPLOY_DB_YES=1
exec "$ROOT/scripts/deploy-prod-db.sh"
