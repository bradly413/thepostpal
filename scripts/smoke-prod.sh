#!/usr/bin/env bash
#
# smoke-prod.sh — post-deploy health check against the live site.
# Verifies the multi-tenant RLS dashboard end-to-end with the demo account.
#
# Usage:
#   ./scripts/smoke-prod.sh                       # defaults to https://www.posterboysocial.com
#   ./scripts/smoke-prod.sh https://your-url      # or a Vercel preview URL
#
# Checks: auth → /api/me (plan) → locations → calendar CRUD → photos CRUD → IDOR 403.

set -uo pipefail

BASE="${1:-https://www.posterboysocial.com}"
JAR="$(mktemp)"
PASS=0; FAIL=0
trap 'rm -f "$JAR"' EXIT

ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $1"; FAIL=$((FAIL+1)); }
code() { curl -s -o /dev/null -w "%{http_code}" -m 20 "$@"; }

echo "Smoke testing: $BASE"
echo ""

echo "1. Auth (demo/demo123)"
AUTH=$(curl -s -m 20 -c "$JAR" -X POST "$BASE/api/auth" -H "Content-Type: application/json" -d '{"username":"demo","password":"demo123"}' -w "\n%{http_code}")
AUTH_CODE=$(echo "$AUTH" | tail -1)
[ "$AUTH_CODE" = "200" ] && ok "login 200" || { bad "login returned $AUTH_CODE"; echo "$AUTH" | head -1; }

echo "2. /api/me"
ME=$(curl -s -m 20 -b "$JAR" "$BASE/api/me")
echo "$ME" | grep -q '"plan"' && ok "me returns plan: $(echo "$ME" | sed -E 's/.*"plan":"([^"]+)".*/\1/')" || bad "me missing plan → $ME"

echo "3. /api/locations"
LOC=$(curl -s -m 20 -b "$JAR" "$BASE/api/locations" | sed -E 's/.*"id":"([^"]+)".*/\1/' | head -1)
[ -n "$LOC" ] && ok "location resolved: $LOC" || bad "no location"

if [ -n "$LOC" ]; then
  echo "4. Calendar create → list → delete"
  EV=$(curl -s -m 20 -b "$JAR" -X POST "$BASE/api/calendar" -H "Content-Type: application/json" -d "{\"locationId\":\"$LOC\",\"title\":\"smoke\",\"type\":\"meeting\",\"startsAt\":\"2026-07-01T15:00:00.000Z\"}")
  EVID=$(echo "$EV" | sed -E 's/.*"event":\{"id":"([^"]+)".*/\1/')
  [ -n "$EVID" ] && [ "$EVID" != "$EV" ] && ok "event created" || bad "event create failed → $EV"
  echo "$(curl -s -m 20 -b "$JAR" "$BASE/api/calendar?locationId=$LOC")" | grep -q "$EVID" && ok "event listed" || bad "event not listed"
  [ "$(code -b "$JAR" -X DELETE "$BASE/api/calendar/$EVID")" = "200" ] && ok "event deleted" || bad "event delete failed"

  echo "5. Photo create → list → delete"
  PH=$(curl -s -m 20 -b "$JAR" -X POST "$BASE/api/photos" -H "Content-Type: application/json" -d "{\"locationId\":\"$LOC\",\"url\":\"/uploads/smoke.png\",\"alt\":\"smoke\"}")
  PHID=$(echo "$PH" | sed -E 's/.*"photo":\{"id":"([^"]+)".*/\1/')
  [ -n "$PHID" ] && [ "$PHID" != "$PH" ] && ok "photo created" || bad "photo create failed → $PH"
  [ "$(code -b "$JAR" -X DELETE "$BASE/api/photos/$PHID")" = "200" ] && ok "photo deleted" || bad "photo delete failed"

  echo "6. RLS / IDOR — foreign location must 403"
  IDOR=$(code -b "$JAR" "$BASE/api/calendar?locationId=not-my-location")
  [ "$IDOR" = "403" ] && ok "foreign location blocked (403)" || bad "expected 403, got $IDOR"
fi

echo ""
echo "─────────────────────────────"
echo "  PASS: $PASS   FAIL: $FAIL"
[ "$FAIL" -eq 0 ] && echo "  ✓ Production looks healthy." || echo "  ✗ Investigate failures above."
exit "$FAIL"
