# Multi-Tenant RLS Implementation

## What changed

- JWT sessions now carry `tenantId` and optional `isSuperadmin`
- `src/proxy.ts` rejects protected requests if the session is missing tenant scope
- `src/lib/db.ts` now exposes `withTenantDb()` to set transaction-local PostgreSQL tenant context
- Core DB-backed API routes now run inside tenant-scoped transactions instead of relying only on `organizationId` filters
- PostgreSQL RLS migration was added at:
  - `prisma/migrations/20260602193000_enable_rls_multi_tenant/migration.sql`

## Transaction-safe tenant binding

Always run tenant-sensitive DB access through:

```ts
await withTenantDb(auth, async (tx) => {
  // use tx.* here
});
```

That helper sets:

- `app.current_tenant_id`
- `app.current_user_id`
- `app.current_is_superadmin`

using `set_config(..., true)` inside a single database transaction so the values are local to that transaction and cannot bleed across pooled connections.

## Where middleware is enforced

### 1. Edge / proxy layer

`src/proxy.ts`

- verifies the signed session cookie
- blocks any protected request whose token does not include tenant scope
- clears stale or legacy-only cookies before they reach app routes

### 2. Route auth layer

`src/lib/api-auth.ts`

- `requireAuthContext()` is the canonical way to load the authenticated tenant context
- the returned context now includes:
  - `userId`
  - `tenantId`
  - `organizationId` (compat alias)
  - `role`
  - `isSuperadmin`

### 3. Database execution layer

`src/lib/db.ts`

- `withTenantDb()` must wrap any Prisma access that touches tenant-owned tables

## Routes already moved onto tenant-scoped DB execution

- `src/app/api/account/locations-roll-up/route.ts`
- `src/app/api/calendar/route.ts`
- `src/app/api/locations/route.ts`
- `src/app/api/locations/[id]/members/route.ts`
- `src/app/api/locations/[id]/route.ts`
- `src/app/api/photos/route.ts`
- `src/app/api/posts/route.ts`
- `src/app/api/posts/[id]/approve/route.ts`
- `src/app/api/posts/[id]/reject/route.ts`
- `src/app/api/posts/[id]/request-changes/route.ts`
- `src/app/api/posts/[id]/submit-for-approval/route.ts`
- `src/app/api/posts/[id]/withdraw/route.ts`
- `src/app/api/social-connections/route.ts`

## IDOR blocking rule

For any route that accepts a resource ID from:

- path params
- query params
- request body

the route should:

1. load auth via `requireAuthContext()`
2. enter `withTenantDb(auth, async (tx) => ...)`
3. resolve the resource only through `tx`
4. deny access if the resource is not returned, or if membership/role checks fail

Under this model, a guessed foreign ID from another tenant should resolve to:

- `404` if the row is invisible under RLS
- `403` if the row is visible to the tenant but the user lacks location-level role access

## Superadmin bypass

Superadmin bypass is controlled by:

- JWT claim: `isSuperadmin`
- env allowlist: `POSTERBOY_SUPERADMIN_EMAILS`
- DB session flag: `app.current_is_superadmin`

Use this only for explicitly system-scoped routes such as platform-wide metrics or admin tooling.

Recommended rule:

- normal product routes still require a tenant-scoped token
- separate admin routes should call `requireSuperadminContext()`
- admin routes may still use `withTenantDb(auth, ...)`, but the RLS helper functions will allow global access when `current_is_superadmin() = true`

## Rollout checklist

1. Apply the Prisma migration against the production PostgreSQL database
2. Re-authenticate users so new sessions include `tenantId`
3. Verify one tenant can read/write its own locations, posts, photos, and approvals
4. Verify cross-tenant ID probes now return `404` or `403`
5. Add the same `withTenantDb()` pattern to any remaining DB-backed routes before expanding the tenant-facing surface
6. Add focused integration tests for:
   - cross-tenant `GET /api/posts?locationId=...`
   - cross-tenant `POST /api/posts/[id]/approve`
   - cross-tenant `PUT /api/locations/[id]`
   - superadmin-only roll-up access
