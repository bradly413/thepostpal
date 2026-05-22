#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_FILE="$REPO_ROOT/docs/CLAUDE-SESSION-HANDOFF-LIVE.md"
NOW_UTC="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
CURRENT_BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
CURRENT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
STATUS_SHORT="$(git -C "$REPO_ROOT" status --short 2>/dev/null || true)"

running_ports() {
  lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR==1 || /node|next/' || true
}

env_key_state() {
  local env_file="$1"
  if [[ ! -f "$env_file" ]]; then
    echo "(missing)"
    return
  fi

  awk -F= '
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      key=$1;
      val=$0;
      sub(/^[^=]*=/, "", val);
      gsub(/^"|"$/, "", val);
      if (length(val) > 0) {
        printf("- %s: set\n", key);
      } else {
        printf("- %s: empty\n", key);
      }
    }
  ' "$env_file" | sort
}

route_check() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$url" 2>/dev/null || echo '000')"
  printf -- "- %s -> %s\n" "$url" "$code"
}

{
  echo "# Claude session handoff (live generated)"
  echo
  echo "Generated: $NOW_UTC"
  echo "Repo: $REPO_ROOT"
  echo "Branch: $CURRENT_BRANCH"
  echo "Commit: $CURRENT_SHA"
  echo
  echo "## 1) Required reading order"
  echo "1. AGENTS.md"
  echo "2. CLAUDE.md"
  echo "3. docs/CLAUDE-SESSION-HANDOFF.md"
  echo "4. docs/CLAUDE-SESSION-HANDOFF-LIVE.md (this file)"
  echo "5. docs/posterboy-growth-plan.md"
  echo "6. docs/brand-implementation-notes.md"
  echo "7. prisma/schema.prisma"
  echo
  echo "## 2) Runtime status"
  echo "### Listening processes"
  echo '```text'
  running_ports
  echo '```'
  echo
  echo "### Route health"
  route_check "http://127.0.0.1:3000/"
  route_check "http://127.0.0.1:3000/sign-in"
  route_check "http://127.0.0.1:3000/dashboard"
  route_check "http://127.0.0.1:8240/"
  route_check "http://127.0.0.1:8240/onboarding"
  echo
  echo "## 3) Git working tree"
  if [[ -n "$STATUS_SHORT" ]]; then
    echo '```text'
    echo "$STATUS_SHORT"
    echo '```'
  else
    echo "Clean working tree"
  fi
  echo
  echo "## 4) Environment key presence (no values)"
  echo "Source: .env.local"
  env_key_state "$REPO_ROOT/.env.local"
  echo
  echo "## 5) Critical paths"
  echo "- App routes: src/app"
  echo "- API routes: src/app/api"
  echo "- Auth: src/lib/auth.ts, src/app/api/auth/route.ts, src/middleware.ts"
  echo "- Prisma: prisma/schema.prisma, prisma/migrations"
  echo "- Location/approval backend:"
  echo "  - src/lib/authz.ts"
  echo "  - src/lib/approval-state-machine.ts"
  echo "  - src/lib/post-approval-service.ts"
  echo "  - src/app/api/locations/**"
  echo "  - src/app/api/posts/[id]/*"
  echo
  echo "## 6) Commands Claude should run first"
  echo '```bash'
  echo "npm install"
  echo "npm run build"
  echo "npm run test"
  echo "npm run dev -- --webpack --hostname 127.0.0.1 --port 3000"
  echo '```'
  echo
  echo "## 7) Known constraints"
  echo "- Do not touch marketing files while another agent is editing them."
  echo "- Prefer webpack mode for local stability after reboot."
  echo "- Do not use production DB or paid API keys for test runs."
} > "$OUT_FILE"

echo "Wrote $OUT_FILE"
