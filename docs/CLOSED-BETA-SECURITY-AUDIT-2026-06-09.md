# Closed-Beta Security Audit — 2026-06-09

Scope reviewed for closed-beta readiness:

- `src/app/api/posts/**`
- `src/app/api/calendar/**`
- `src/app/api/brand-book/**`
- `src/app/api/meta/**`
- `src/app/api/upload/**`
- `src/app/api/auth/meta/**`

## Findings Summary

| Area | Status | Notes |
|---|---|---|
| Meta token storage at rest | Fixed | `SocialAccount.accessToken` and `SocialConnection.accessToken` now use app-level AES-256-GCM encryption via `TOKEN_ENC_KEY`. New writes encrypt at rest; publish loaders decrypt before Meta API calls. Existing rows require the backfill script. |
| Post route error masking | Fixed | `src/app/api/posts/route.ts` and `src/app/api/posts/[id]/route.ts` no longer collapse unexpected errors into `401 Unauthorized`. |
| Calendar route error masking | Fixed | `src/app/api/calendar/route.ts` and `src/app/api/calendar/[id]/route.ts` now distinguish auth failures from internal failures. |
| Brand-book route scoping | Improved | `src/app/api/brand-book/route.ts` now performs location access checks inside `withTenantDb(...)` using `resolveAccess(...)`, instead of checking outside the transaction helper. |
| Meta route error masking | Improved | `src/app/api/meta/insights/route.ts` and `src/app/api/meta/ad-accounts/route.ts` now return `500` on unexpected failures instead of `401`. |
| Upload route scoping | Improved | `src/app/api/upload/route.ts` now requires auth and stores under tenant-specific keys/paths. `src/app/api/upload/presigned/route.ts` was already auth-scoped. |
| Monitoring | Partially fixed in code | Sentry is now wired for Next.js client/server instrumentation and cron exception capture. DSNs and alert rules still need to be configured in Sentry/Vercel by Brad. |
| Migration replay order | Fixed in repo | The early scheduled-post Meta migration is now shadow-safe, and the real enum/column additions replay later in the chain. |

## Tenant Route Audit

Expected pattern for tenant-owned data:

`requireAuthContext()` → `withTenantDb(auth, fn)` → `resolveAccess(userId, locationId, tx)` → scoped query

### Posts

- `src/app/api/posts/route.ts`
- `src/app/api/posts/[id]/route.ts`

Result:

- Scoped by tenant and location membership
- Error handling now returns `500` on non-auth failures

### Calendar

- `src/app/api/calendar/route.ts`
- `src/app/api/calendar/[id]/route.ts`

Result:

- Scoped by tenant and location membership
- Error handling now returns `500` on non-auth failures

### Brand book

- `src/app/api/brand-book/route.ts`

Result:

- Now scoped fully inside `withTenantDb(...)`
- Uses `resolveAccess(...)` and editor-role enforcement before write

### Meta

- `src/app/api/meta/publish/route.ts`
- `src/app/api/meta/insights/route.ts`
- `src/app/api/meta/ad-accounts/route.ts`
- `src/app/api/auth/meta/callback/route.ts`

Result:

- Callback persists through helpers that enforce location access
- Publish/insights/ad-account routes are tenant-scoped through `withTenantDb(...)`
- Error masking reduced on the audited routes above
- Meta token loaders now decrypt from encrypted-at-rest storage before API use

### Upload

- `src/app/api/upload/route.ts`
- `src/app/api/upload/presigned/route.ts`

Result:

- These routes are not DB-backed tenant-resource reads, so they do not use `resolveAccess(...)`
- They are now authenticated and tenant-keyed
- `upload/presigned` remains the preferred route because it avoids API-body upload bottlenecks

## Residual Risks Outside This Audit Slice

- Several other tenant routes still use blanket outer catches returning `401` or `403` on unexpected failures. They should be normalized to the same pattern used in posts/calendar/brand-book over the next hardening pass.
- Sentry alert delivery is not fully complete until Brad configures DSNs and creates alert rules in the Sentry project.

## Required Operator Actions For Brad

1. Set `TOKEN_ENC_KEY` in env before using the encrypted Meta SocialAccount flow.
2. Run the backfill after setting the key:

```bash
npm run tokens:migrate:social
```

3. Set Sentry env vars:

```bash
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
```

4. In Sentry, create alert rules for:
   - any new production issue
   - `/api/cron/publish` failures
5. Rotate the **Neon database password** and **AWS IAM keys** that were exposed in chat during setup. Keep all secrets in env only; do not leave them in chat logs, docs, or local plaintext notes.

## Acceptance Mapping

- Token rows are ciphertext after backfill: code ready, backfill script committed for both SocialAccount and SocialConnection token fields
- Publish path still works: SocialAccount publish and SocialConnection-backed Meta loaders now decrypt before Meta calls
- `/api/posts` returns `500` on non-auth failures: fixed
- Sentry capture exists for client/server/cron: code wired; alert rules still require operator setup
- Migration replay ordering repaired: repo fixed; local DB verification still depends on a running Postgres instance
