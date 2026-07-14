---
name: launch-check
description: One-command Posterboy production health verdict — deploy status, 12-check API smoke, cron tick health, prod DB queue state (stuck claims / failed posts / zombies), and required env presence. Run after every deploy, before announcing anything, and any time something feels off.
---

# Launch Check

Run the bundled script and report its verdict:

```bash
chmod +x .claude/skills/launch-check/scripts/launch-check.sh 2>/dev/null
.claude/skills/launch-check/scripts/launch-check.sh
```

Exit code = number of failures. Requirements: `vercel` CLI and `neonctl` authed on this machine (both already are on Brad's Mac), `psql` installed.

## Interpreting results

| Signal | Meaning | First move |
|--------|---------|-----------|
| Deploy not READY | Build failed or still running | `npx vercel ls angie-social-portal --scope bradly413s-projects`; ignore red **Preview** rows (expected — AUTH_SECRET is prod-only) |
| Smoke failure | An API surface regressed | Read `/tmp/launch-check-smoke.log`; auth failures first (KV env), then RLS 403 check |
| Cron 500s | **Publishing is down** | Check Sentry `job:cron_publish`; if the error is an unknown enum/column, a migration is missing on prod — `./scripts/deploy-prod-db.sh` |
| Stuck publishing claims | A cron run died mid-publish | The post may already be live on Meta — check the page before Retry (the stale sweep will mark it failed within 15 min) |
| Failed posts listed | Normal ops, not an outage | Each shows in the dashboard (Drafts/Calendar) with Retry; `errorLog` says why. Token errors → the brand needs the Reconnect flow |
| Zombie scheduled rows | Legacy Meta-native rows | Park as draft with a note (see audit F9, 2026-07-11) |
| Env var missing | Deploy-time config gap | Brad sets prod env in the Vercel console; agents cannot |

## Cadence

- After every deploy (the `/ship` skill runs this automatically as its last step)
- Nightly via a scheduled routine during launch week
- Before/after any Meta app or Stripe configuration change
