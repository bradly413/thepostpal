# Admin provisioning (superadmin)

Posterboy **superadmin** access is controlled by an env allowlist — not a database flag and not a password you set for someone else.

## What superadmin grants

- `isSuperadmin: true` on `GET /api/me`
- RLS bypass for cross-tenant reads/writes (`app.current_is_superadmin` in Postgres)
- Skips per-location access checks in `resolveAccess` paths when superadmin

There is no separate “admin panel” URL today; superadmin is an **ops / cross-tenant** capability wired through auth + RLS.

## Provision a new admin (e.g. Cameron)

**You (Brad) — one-time setup**

1. Get the person’s **exact login email** (case-insensitive match).
2. In Vercel → project `angie-social-portal` → **Production** env, set or update:
   ```
   POSTERBOY_SUPERADMIN_EMAILS=cameron@example.com
   ```
   Multiple admins: comma-separated, no spaces required (`a@x.com,b@y.com`).
3. **Redeploy** production (env changes do not apply until redeploy).

**The new admin — self-service**

4. Open https://www.posterboysocial.com/sign-in?mode=signup
5. Create an account with **that same email** and their own password (8+ chars, letter + number).
6. Complete onboarding if prompted → lands on `/dashboard`.

**Verify**

7. While logged in as that user, open `/api/me` (browser or devtools). Response must include:
   ```json
   { "isSuperadmin": true, ... }
   ```
8. Or run smoke after setting a test cookie — superadmin should see org data across tenants when using superadmin-scoped routes.

## Existing account already signed up?

If Cameron signed up **before** his email was on the allowlist:

1. Add email to `POSTERBOY_SUPERADMIN_EMAILS` and redeploy.
2. Have him **sign out and sign back in** (or hard-refresh dashboard so `/api/me` re-runs with the new env).

No password reset or DB migration required.

## Local dev

In `.env.local`:

```
POSTERBOY_SUPERADMIN_EMAILS=you@example.com
```

Restart `npm run dev`, then sign up or log in with that email.

## Do not

- Create credentials or passwords on behalf of the admin in code or scripts.
- Store superadmin emails in the database or Prisma schema.
- Commit real emails to the repo — env only.

## Related

- `src/lib/auth.ts` — `isSuperadminEmail`, `resolveSessionSuperadmin`
- `docs/PROD-ENV-CHECKLIST.md` — production env inventory
- `docs/MULTI_TENANT_RLS_IMPLEMENTATION.md` — RLS + superadmin GUC
