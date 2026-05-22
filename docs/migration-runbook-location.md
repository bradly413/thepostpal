# posterboy location migration runbook

This runbook implements the location model + corporate approval workflow migration in four phases.

## Preconditions

1. Set `DATABASE_URL` to a non-production PostgreSQL database for rehearsal.
2. Install deps: `npm install`.
3. Generate client: `npx prisma generate`.

## Phase 1: additive schema (safe)

1. Create migration SQL for review only:

```bash
npx prisma migrate dev --create-only --name location_model
```

2. Inspect SQL under `prisma/migrations/*_location_model/migration.sql`.
3. Apply in non-prod for validation:

```bash
npx prisma migrate dev
```

Rollback (phase 1):
- If not applied: delete migration folder.
- If applied in non-prod: `npx prisma migrate reset` (destructive, non-prod only).

## Phase 2: backfill default locations

Dry-run first:

```bash
npx tsx prisma/scripts/backfill-default-locations.ts
```

Apply:

```bash
npx tsx prisma/scripts/backfill-default-locations.ts --apply
```

Validation queries:

```sql
select count(*) from "SocialConnection" where "locationId" is null;
select count(*) from "ScheduledPost" where "locationId" is null;
select count(*) from "PhotoAsset" where "locationId" is null;
select count(*) from "CalendarEvent" where "locationId" is null;
select count(*) from "KnowledgeBaseEntry" where "locationId" is null;
```

Rollback (phase 2):
- Re-run backfill after fixing script issues (idempotent).
- For non-prod full rollback, reset DB and rerun phase 1.

## Phase 3: enforce NOT NULL (gated)

Do not run until all null checks are zero and feature flag approval is given.

1. Create follow-up migration that sets `locationId` NOT NULL on:
- `SocialConnection`
- `ScheduledPost`
- `PhotoAsset`
- `CalendarEvent`
- `KnowledgeBaseEntry`

2. Apply only in maintenance window.

Rollback (phase 3):
- New migration to relax constraints back to nullable.

## Phase 4: UI gating (separate track)

Not in this runbook. Backend is ready for location-aware gating.

## Production sequence

1. `npx prisma migrate deploy`
2. `npx tsx prisma/scripts/backfill-default-locations.ts --apply`
3. Run null-count validation queries
4. Enable location APIs for internal users
5. Roll out Phase 3 NOT NULL migration after validation

## Build/test checklist

```bash
npm run test
npm run build
```

If either fails, stop rollout and fix before migration deploy.
