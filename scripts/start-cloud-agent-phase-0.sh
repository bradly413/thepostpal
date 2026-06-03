#!/usr/bin/env bash
# Launch a Cursor Cloud Agent for Phase 0 (dead store migration).
# Usage:
#   export CURSOR_API_KEY="cursor_..."   # https://cursor.com/dashboard → API Keys
#   ./scripts/start-cloud-agent-phase-0.sh
#
# Without CURSOR_API_KEY: prints UI steps and the prompt path.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load CURSOR_API_KEY from repo .env.local if not already exported
if [[ -z "${CURSOR_API_KEY:-}" && -f "$REPO_ROOT/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$REPO_ROOT/.env.local"
  set +a
fi
PROMPT_FILE="$REPO_ROOT/docs/cloud-agent/PHASE-0-PROMPT.txt"
REPO_URL="https://github.com/bradly413/thepostpal"
START_REF="main"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Missing prompt file: $PROMPT_FILE" >&2
  exit 1
fi

echo "=== Posterboy Cloud Agent — Phase 0 ==="
echo "Repo: $REPO_URL @ $START_REF"
echo "Prompt: $PROMPT_FILE"
echo "Expected branch: chore/migrate-dead-stores-phase-0 (agent creates from prompt)"
echo ""

if [[ -z "${CURSOR_API_KEY:-}" ]]; then
  echo "CURSOR_API_KEY is not set — use Cursor UI instead:"
  echo ""
  echo "  1. Cursor → Agents → New Cloud Agent"
  echo "  2. Repository: bradly413/thepostpal, base branch: main"
  echo "  3. Paste contents of: docs/cloud-agent/PHASE-0-PROMPT.txt"
  echo "  4. Optional: enable 'Create PR' when done"
  echo "  5. Start → wait for Running → close laptop"
  echo ""
  echo "Prompt preview (first 20 lines):"
  head -20 "$PROMPT_FILE"
  exit 0
fi

PROMPT_TEXT="$(cat "$PROMPT_FILE")"

# Build JSON with jq (prompt may contain quotes/newlines)
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for API launch. Install jq or use the UI steps above." >&2
  exit 1
fi

BODY="$(jq -n \
  --arg text "$PROMPT_TEXT" \
  --arg url "$REPO_URL" \
  --arg ref "$START_REF" \
  '{
    name: "Phase 0 — dead store migration",
    prompt: { text: $text },
    repos: [{ url: $url, startingRef: $ref }],
    autoCreatePR: true,
    skipReviewerRequest: true,
    workOnCurrentBranch: false
  }')"

echo "Creating cloud agent via API..."
RESPONSE="$(curl -sS --fail-with-body \
  --request POST \
  --url "https://api.cursor.com/v1/agents" \
  -u "${CURSOR_API_KEY}:" \
  --header "Content-Type: application/json" \
  --data "$BODY")" || {
  echo "API request failed. Check CURSOR_API_KEY and repo access." >&2
  exit 1
}

AGENT_URL="$(echo "$RESPONSE" | jq -r '.agent.url // empty')"
AGENT_ID="$(echo "$RESPONSE" | jq -r '.agent.id // empty')"
RUN_ID="$(echo "$RESPONSE" | jq -r '.run.id // empty')"

echo ""
echo "Cloud agent started."
echo "  Agent ID: ${AGENT_ID:-unknown}"
echo "  Run ID:   ${RUN_ID:-unknown}"
if [[ -n "$AGENT_URL" ]]; then
  echo "  Dashboard: $AGENT_URL"
fi
echo ""
echo "You can close your laptop once the run shows active in Cursor."
echo "Morning: check that URL or GitHub for branch chore/migrate-dead-stores-phase-0"
