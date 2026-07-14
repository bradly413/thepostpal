---
name: ship
description: Deploy Posterboy to production safely — verify branch and tests, gate on prod DB migrations BEFORE pushing (main auto-deploys), push, watch the deploy, and run launch-check. Use whenever code is ready to go live.
disable-model-invocation: true
---

# Ship

Deploy the current state of `main` to production, in the only order that is safe.
**Why this exists:** on 2026-07-12 a migration-dependent commit reached `main`
before its migration ran on prod — every cron tick 500'd for ~27 hours and
nobody noticed. Every step below closes a hole we have actually fallen into.

## 1. Preflight

```bash
git branch --show-current        # must be main — if not, STOP and ask Brad
git status --short               # tree must be clean or contain only the work being shipped
git log --oneline origin/main..main   # review exactly what will deploy
```

Then the full battery — all three must pass before anything else:

```bash
npm run test && npx tsc --noEmit && npm run build
```

## 2. Migration gate (the step that prevents outages)

```bash
URL=$(npx --yes neonctl connection-string --project-id shiny-sky-49937641 2>/dev/null | tr -d '[:space:]')
DATABASE_URL="$URL" npx prisma migrate status
```

- **Pending migrations?** Apply them NOW, before pushing:
  `DATABASE_URL="$URL" npx prisma migrate deploy`
  (or `./scripts/deploy-prod-db.sh "$URL"` for the guarded interactive version).
  Additive migrations are safe to apply ahead of the code; the code must NEVER
  arrive ahead of the migration.
- **"Database schema is up to date!"** → proceed.
- Prisma major-version note: run from the repo root so the pinned Prisma 6.x in
  `node_modules` is used — a bare `npx prisma` in a fresh dir pulls v7 and fails.

## 3. Push and watch

```bash
git push origin main
```

Poll until the **Production** row is READY (~2 min):

```bash
npx vercel ls angie-social-portal --scope bradly413s-projects | grep Production | head -1
```

Known red herring: **Preview** deployments always show Error (AUTH_SECRET is
prod-only). Only the Production row matters.

## 4. Verify (non-negotiable)

Run the launch-check skill and report its verdict to Brad:

```bash
.claude/skills/launch-check/scripts/launch-check.sh
```

If cron ticks show 500s right after a schema-touching deploy, the migration
gate was skipped — apply the migration immediately and confirm the next tick
is 200 (ticks run every 5 minutes).

## 5. Report

Tell Brad: commit range deployed, deployment id, launch-check PASS/FAIL counts,
and anything a human should eyeball (UI changes → phone check; publish-pipeline
changes → watch the next scheduled post go out).

## Hard rules

- Never push with pending prod migrations. Never.
- Never ship publish-pipeline changes when no one will be around for the next
  few cron ticks.
- If Cursor (or any other tool) shares the working tree, check
  `git branch --show-current` and `git stash list` before starting.
