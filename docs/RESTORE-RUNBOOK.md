# Restore Runbook — Posterboy Social production

Last verified: 2026-06-09

## Current backup state

- Neon project: `posterboy-prod`
- Branch checked: `production`
- Neon `Backup & Restore` page showed a **6 hour history window**
- Snapshot schedules were **not** enabled on the checked plan

This means point-in-time restore is available now, but the recovery window is currently short.

## When to use this runbook

Use this when production data is corrupted, a destructive migration slips through, or tenant data needs to be recovered to a known-good timestamp.

## Restore strategy

Prefer restoring to a **new branch first**, validate it, then cut production over deliberately. Do not rush into an in-place overwrite unless the outage demands it and you fully understand the blast radius.

## Brad's click-path for a point-in-time restore

1. Open Neon Console.
2. Open project `posterboy-prod`.
3. Open the `production` branch.
4. Open `Backup & Restore`.
5. Choose the restore timestamp inside the available history window.
6. Restore to a new branch from that timestamp.
7. Wait for Neon to finish creating the restored branch.

## Validation before cutover

Use the restored branch before pointing production at it.

1. Open the restored branch connection details.
2. Run the basic schema checks:
   - `ScheduledPost.mediaUrls` exists
   - `SocialAccount` exists
   - tenant-scoped tables look sane
3. Run a minimal application smoke test against the restored branch if time allows.
4. Confirm the data-loss boundary with Brad before making the branch live.

## Production cutover

If the restored branch is the right recovery point:

1. Copy the restored branch connection string.
2. Update the production database connection used by Vercel.
3. Redeploy production.
4. Smoke-test:
   - login
   - posts
   - calendar
   - Meta routes
   - cron publish

If Neon↔Vercel integration is already connected, prefer the integration-managed branch/connection flow instead of hand-editing a manual `DATABASE_URL`.

## After the incident

1. Record the restore timestamp used
2. Record which tenants or time window lost writes
3. Decide whether the 6 hour PITR window is sufficient for closed beta
4. Upgrade to scheduled snapshots if Brad wants a longer, more operator-friendly recovery path
