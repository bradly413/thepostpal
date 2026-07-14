#!/usr/bin/env bash
#
# launch-check.sh — one-command production health verdict for Posterboy.
#
# Read-only. Checks, in order:
#   1. Latest production deployment is READY (ignores Preview rows — those
#      error on missing AUTH_SECRET by design)
#   2. Full API smoke suite (scripts/smoke-prod.sh, 12 checks)
#   3. Recent cron ticks are 200 (a 500 streak = publishing is down)
#   4. Prod DB queue health: counts by status, stuck "publishing" claims,
#      failed posts with their errorLog
#   5. Required env vars present in Vercel prod (names only, never values)
#
# Requirements: vercel CLI + neonctl authed on this machine, psql installed.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

SCOPE="bradly413s-projects"
PROJECT="angie-social-portal"
NEON_PROJECT="shiny-sky-49937641"   # posterboy-prod org
PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "Posterboy launch check — $(date '+%Y-%m-%d %H:%M %Z')"
echo ""

echo "1. Production deployment"
# NB: vercel CLI prints its table to STDERR
DEPLOY_LINE=$(npx vercel ls "$PROJECT" --scope "$SCOPE" 2>&1 | grep "Production" | head -1)
DEPLOY_URL=$(echo "$DEPLOY_LINE" | grep -oE 'https://[^ ]+')
if echo "$DEPLOY_LINE" | grep -q "Ready"; then
  ok "latest production deploy READY (${DEPLOY_URL##*://})"
else
  bad "latest production deploy not READY: $(echo "$DEPLOY_LINE" | awk '{print $1, $5}')"
fi

echo "2. API smoke suite"
if ./scripts/smoke-prod.sh >/tmp/launch-check-smoke.log 2>&1; then
  ok "smoke-prod $(grep -oE 'PASS: [0-9]+' /tmp/launch-check-smoke.log | head -1)"
else
  bad "smoke-prod FAILED — tail of log:"
  tail -8 /tmp/launch-check-smoke.log | sed 's/^/    /'
fi

echo "3. Cron publish ticks"
if [ -n "${DEPLOY_URL:-}" ]; then
  TICKS=$(npx vercel logs "$DEPLOY_URL" --scope "$SCOPE" 2>&1 | grep "cron/publish" | grep -v "401" | head -3)
  ERRS=$(echo "$TICKS" | grep -c "500" || true)
  if [ -z "$TICKS" ]; then
    ok "no cron ticks in recent log window (fresh deploy — re-run in ~10 min)"
  elif [ "$ERRS" -eq 0 ]; then
    ok "recent cron ticks healthy (200)"
  else
    bad "cron ticks returning 500 — PUBLISHING IS DOWN. Check CRON_SECRET value + Sentry job:cron_publish"
  fi
else
  bad "skipped — no deployment URL"
fi

echo "4. Prod DB queue health"
URL=$(npx --yes neonctl connection-string --project-id "$NEON_PROJECT" 2>/dev/null | tr -d '[:space:]')
if [ -z "$URL" ]; then
  bad "could not get Neon connection string (neonctl auth expired?)"
else
  DB_OUT=$(psql "${URL%%\?*}" -v ON_ERROR_STOP=1 -t -A -F'|' 2>/dev/null <<'SQL'
BEGIN;
SELECT set_config('app.current_tenant_id','',true),
       set_config('app.current_user_id','launch-check',true),
       set_config('app.current_is_superadmin','true',true);
SELECT 'status', status, count(*) FROM "ScheduledPost" GROUP BY status ORDER BY status;
SELECT 'stuck_publishing', id, "organizationId" FROM "ScheduledPost"
  WHERE status='publishing' AND "updatedAt" < now() - interval '20 minutes';
SELECT 'failed', id, "organizationId", left(coalesce("errorLog",''),80) FROM "ScheduledPost"
  WHERE status='failed' ORDER BY "updatedAt" DESC LIMIT 5;
SELECT 'zombie_scheduled', count(*) FROM "ScheduledPost"
  WHERE status='scheduled' AND "scheduledFor" < now() - interval '1 hour';
ROLLBACK;
SQL
)
  if [ -z "$DB_OUT" ]; then
    bad "prod DB query failed"
  else
    echo "$DB_OUT" | grep "^status" | awk -F'|' '{printf "    %s: %s\n", $2, $3}'
    STUCK=$(echo "$DB_OUT" | grep -c "^stuck_publishing" || true)
    NFAILED=$(echo "$DB_OUT" | grep -c "^failed" || true)
    ZOMBIES=$(echo "$DB_OUT" | grep "^zombie_scheduled" | awk -F'|' '{print $2}')
    [ "$STUCK" -eq 0 ] && ok "no stuck publishing claims" || bad "$STUCK stuck publishing claim(s) — see rows above; post may already be live"
    if [ "$NFAILED" -eq 0 ]; then ok "no failed posts"; else
      ok "note: $NFAILED failed post(s) awaiting user Retry/Skip:"
      echo "$DB_OUT" | grep "^failed" | awk -F'|' '{printf "    %s (%s): %s\n", $2, $3, $4}'
    fi
    [ "${ZOMBIES:-0}" -eq 0 ] && ok "no zombie 'scheduled' rows" || bad "$ZOMBIES zombie 'scheduled' row(s) — cron never dispatches these (audit F9)"
  fi
fi

echo "5. Required prod env (presence only)"
ENVLIST=$(npx vercel env ls production --scope "$SCOPE" 2>&1)
MISSING=""
for VAR in DATABASE_URL AUTH_SECRET CRON_SECRET TOKEN_ENC_KEY KV_REST_API_URL S3_BUCKET S3_PUBLIC_BASE_URL SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN NEXT_PUBLIC_APP_URL META_APP_SECRET GEMINI_API_KEY; do
  echo "$ENVLIST" | grep -q "^ $VAR \|^ $VAR	\| $VAR  " || MISSING="$MISSING $VAR"
done
if [ -z "$MISSING" ]; then
  ok "all required env vars present"
else
  bad "missing from Vercel prod:$MISSING"
fi
echo "    (presence ≠ non-empty: an empty CRON_SECRET killed publishing on 2026-06-26 — smoke's cron-401 check covers that)"

echo ""
echo "─────────────────────────────"
echo "  PASS: $PASS   FAIL: $FAIL"
[ "$FAIL" -eq 0 ] && echo "  ✓ Launch-ready as far as machines can tell." || echo "  ✗ Fix the failures above before shipping."
exit "$FAIL"
