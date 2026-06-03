# Production env checklist — before merging `pricing/solo-command-june-2026` → `main`

Merging to `main` auto-deploys `angie-social-portal`. Set these on Vercel **production** first or the listed features 500 in the wild. Derived from `process.env.*` usage in `src/` (2026-06-03).

Commands run interactively (Vercel prompts for the value — it's not passed on the CLI):
```bash
npx vercel env add <NAME> production --scope bradly413s-projects
```
Pull them back to verify / sync local:
```bash
npx vercel env pull .env.production.local --environment=production --scope bradly413s-projects
```

---

## 🔴 TIER 0 — without this the whole wired dashboard is dead in prod

**`DATABASE_URL`** — not in the `process.env` grep because Prisma reads it from the datasource, but it's the #1 blocker. The dashboard now runs on Postgres + RLS; locally that's `posterboy_rls_dev`. Production needs a **hosted Postgres** (Supabase / Neon / RDS), then:

```bash
npx vercel env add DATABASE_URL production --scope bradly413s-projects   # paste the hosted connection string
# then apply schema + RLS + the calendar_event_type migration to that DB:
DATABASE_URL="<prod-connection-string>" npx prisma migrate deploy
```
⚠️ The RLS policies live in migration `20260602193000_enable_rls_multi_tenant` — `migrate deploy` must run against prod or tenant isolation won't exist there.

---

## 🟠 TIER 1 — already-known gaps (per handoff), set to restore features

| Var | Without it |
|---|---|
| `LEONARDO_API_KEY` | Studio HD upscale + remove-bg 500 |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | signups fall back to ephemeral `/tmp` (lost on redeploy). Or alias the existing `KV_REST_API_URL/_TOKEN` values. |
| `NEXT_PUBLIC_APP_URL` | OAuth redirects / canonical URLs point wrong — set to `https://www.posterboysocial.com` |

## 🟠 TIER 1 — uploads (new since this branch)

Uploads fall back to **ephemeral local disk** on Vercel unless S3 is configured. Need all four (S3_* or AWS_* names both work):
```
S3_BUCKET   S3_REGION   AWS_ACCESS_KEY_ID   AWS_SECRET_ACCESS_KEY
```
Optional for R2/MinIO: `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`, `S3_FORCE_PATH_STYLE=true`.

## 🟠 TIER 1 — Stripe billing (new since this branch)

Billing short-circuits gracefully if `STRIPE_SECRET_KEY` is unset (no crash), but Solo/Command checkout + webhooks won't work without the full set:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET                     # from the Stripe dashboard webhook → /api/webhooks/stripe
STRIPE_PRICE_SOLO_MONTHLY
STRIPE_PRICE_SOLO_ANNUAL
STRIPE_PRICE_COMMAND_BASE_MONTHLY
STRIPE_PRICE_COMMAND_LOCATION_MONTHLY
```
Note: `/api/webhooks/stripe` is already exempted from auth (commit `492452e`).

---

## 🟢 SHOULD ALREADY BE SET (verify, don't assume)
`ANTHROPIC_API_KEY` · `GEMINI_API_KEY` · `AUTH_SECRET` · `PORTAL_USERNAME` · `PORTAL_PASSWORD` · `META_APP_SECRET` · `NEXT_PUBLIC_META_APP_ID` · `META_PAGE_ACCESS_TOKEN` · `META_REDIRECT_URI` · `VIMEO_ACCESS_TOKEN` · `KV_REST_API_URL` · `KV_REST_API_TOKEN`

Optional / niche: `AUTH_STORE_DIR`, `POSTERBOY_SUPERADMIN_EMAILS`, `JWT_SECRET`/`NEXTAUTH_SECRET` (fallbacks for `AUTH_SECRET`).

---

## Recommended deploy order
1. Provision hosted Postgres → set `DATABASE_URL` → `prisma migrate deploy` against it.
2. Set Tier 1 vars (Leonardo, Upstash, S3, Stripe, APP_URL).
3. Open PR `pricing/solo-command-june-2026` → `main`, review the 48-commit diff.
4. Merge → Vercel deploys → smoke test: demo login, `/api/me`, photo upload, calendar event, a Stripe test checkout.
5. Re-login any existing demo sessions (they predate DB provisioning).
