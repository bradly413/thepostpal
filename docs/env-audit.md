# Production env audit — angie-social-portal

> ⚠️ **STALE (2026-05-23 snapshot).** Superseded by `docs/PROD-ENV-CHECKLIST.md`; per the 2026-07-11 audit this file predates Stripe/S3/Sentry/token-crypto/`CRON_SECRET`. Do not trust it for current prod state.

**Generated:** 2026-05-23 (overnight Day-2 prep, Task D)
**Method:** `vercel env ls production` + `grep -r "process.env\." src/` + `.env.example`
**Verdict:** 1 P1 (Leonardo broken), 1 architectural mismatch (Upstash naming), several harmless gaps.

---

## TL;DR — what to act on

| Severity | Finding | Action |
|---|---|---|
| 🔴 **P1** | `LEONARDO_API_KEY` missing on prod | Set via `vercel env add LEONARDO_API_KEY production` — Studio's HD upscale + remove-bg are dead without it |
| ⚠️ **Architectural** | Code uses `UPSTASH_REDIS_REST_*`; prod has `KV_REST_API_*` (Vercel KV, same Upstash backend) | Either: (a) add `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` aliased to the same values, or (b) refactor `src/lib/auth-store.ts` to read `KV_REST_API_*`. Currently silently falls back to `/tmp` (Vercel-safe but ephemeral) |
| ✅ Fine | `STRIPE_SECRET_KEY` missing, `AUTH_STORE_DIR` unset | Both are feature-gated / have safe defaults |
| 🧹 Cleanup | Orphan `ANTHROPIC_API_KEY` on **`thepostpal-readable-v2`** project (created earlier today during diagnosis when we mistook it for the live project) | Delete it from that project — it's unused; live site is on `angie-social-portal` |

---

## Live keys on `angie-social-portal` (production target)

15 keys total, all encrypted:

```
REDIS_URL                       Production, Preview, Development
KV_REST_API_URL                 Production, Preview, Development
KV_REST_API_READ_ONLY_TOKEN     Production, Preview, Development
KV_URL                          Production, Preview, Development
KV_REST_API_TOKEN               Production, Preview, Development
ANTHROPIC_API_KEY               Preview, Production
PORTAL_PASSWORD                 Production
PORTAL_USERNAME                 Production
VIMEO_ACCESS_TOKEN              Production
META_PAGE_ACCESS_TOKEN          Production
META_REDIRECT_URI               Production
META_APP_SECRET                 Production
NEXT_PUBLIC_META_APP_ID         Production
GEMINI_API_KEY                  Production
AUTH_SECRET                     Production
```

## Code-side `process.env.*` references

18 distinct keys read by `src/`:

```
ANTHROPIC_API_KEY      ✅ set
AUTH_SECRET            ✅ set
AUTH_STORE_DIR         ⚪ not set (defaults to "/tmp" via auth-store.ts:44)
GEMINI_API_KEY         ✅ set
JWT_SECRET             ⚪ not set (auth.ts uses fallback chain: AUTH_SECRET → JWT_SECRET → NEXTAUTH_SECRET → hardcoded fallback)
LEONARDO_API_KEY       🔴 NOT SET, but used by 3 Leonardo routes
META_APP_SECRET        ✅ set
META_PAGE_ACCESS_TOKEN ✅ set
META_REDIRECT_URI      ✅ set
NEXTAUTH_SECRET        ⚪ not set (fallback only)
NEXT_PUBLIC_META_APP_ID ✅ set
NODE_ENV               ✅ Vercel auto-sets
PORTAL_PASSWORD        ✅ set
PORTAL_USERNAME        ✅ set
STRIPE_SECRET_KEY      ❎ not set — feature-gated (location-billing.ts:13 short-circuits)
UPSTASH_REDIS_REST_TOKEN  ❌ not set under this name (see "Architectural" below)
UPSTASH_REDIS_REST_URL    ❌ not set under this name (see "Architectural" below)
VIMEO_ACCESS_TOKEN     ✅ set
```

---

## Detail: Architectural mismatch — Upstash vs KV naming

`src/lib/auth-store.ts:64` reads:

```ts
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // use Upstash Redis for auth-store persistence
}
```

Production has the **Vercel-native KV names** (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) — same Upstash backend, different env var names. The conditional fails. Code falls through to the next branch (file-based `/tmp` storage), which works on Vercel because `vercel-safe tmp fallback for auth store` was added in `ba1e928` (the May 21 fix).

**Current state:** auth signup works on prod, but credentials live in `/tmp` on a single Vercel function instance. Ephemeral across cold-starts. Fine for closed beta with friendly testers; not durable for real signups.

**Options:**
- **Quick (1 min):** Add two new Vercel env vars `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` mirroring the existing `KV_REST_API_URL` and `KV_REST_API_TOKEN` values. Code starts using Upstash immediately, durable signups.
- **Proper (15 min):** Update `auth-store.ts` to read either name (`process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL`). No new env vars needed.

Recommend the quick path for beta + a follow-up to do the proper refactor.

---

## Detail: 🔴 Leonardo

`src/app/api/leonardo/{status,edit,upload}/route.ts` all start with:

```ts
const apiKey = process.env.LEONARDO_API_KEY;
if (!apiKey) {
  return NextResponse.json({ error: "LEONARDO_API_KEY not configured" }, { status: 500 });
}
```

Without it, **every** Leonardo route returns `500 {"error": "LEONARDO_API_KEY not configured"}`. That breaks the Studio flow:
- Generate image → ✅ works (Gemini, key set)
- Upscale HD → ❌ 500
- Remove background → ❌ 500

**Action:** Add the key via Vercel CLI or UI:
```bash
vercel env add LEONARDO_API_KEY production
# paste sk_… value when prompted
vercel deploy --prod -y  # redeploy so the new env var is picked up
```

---

## Detail: Stripe — fine as-is

`src/lib/location-billing.ts:13` returns `null` early if `STRIPE_SECRET_KEY` isn't set, gating the entire billing/locations-fee path. No runtime crash. Add only when actually wiring billing.

---

## Detail: NextAuth / JWT fallback chain

`src/lib/auth.ts` reads in order: `AUTH_SECRET` → `JWT_SECRET` → `NEXTAUTH_SECRET` → hardcoded `"posterboy-dev-fallback-secret-change-me"`. Since `AUTH_SECRET` is set, the others don't need to be. The hardcoded fallback is a concern for production sec hygiene (anyone reading the repo can forge tokens if the env var ever unsets), but `AUTH_SECRET` is currently set so this is dormant. Worth a follow-up to throw on missing instead of falling back to a known constant.

---

## Comparison to `.env.example` (repo docs)

`.env.example` lists 15 keys. Diff vs. what code actually reads:

**In `.env.example` but never read by code:**
- `VERCEL_OIDC_TOKEN` — Vercel injects this automatically; documentation-only

**Read by code but not documented in `.env.example`:**
- `AUTH_STORE_DIR`, `JWT_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_REDIRECT_URI`, `NEXTAUTH_SECRET`, `STRIPE_SECRET_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`

Suggest a `.env.example` refresh post-beta. Low priority.

---

## Snapshot of the orphan project

`thepostpal-readable-v2` (project ID `prj_g96nhEB48peTkhdUzeTLi9rpubhA`) — same GitHub repo, but no production domain attached. Earlier today during diagnosis I mistakenly set `ANTHROPIC_API_KEY` on this project before discovering the domain lives on `angie-social-portal`. That env var is unused.

Recommended cleanup post-beta: either delete the orphan project, or delete the env var from it, OR repurpose it as a staging environment by pointing a preview branch at it. Token API was 403 when I tried to inspect; will require fresh `vercel env ls` after relink.

---

## Beta-launch checklist (env)

- [ ] **🔴 Set `LEONARDO_API_KEY` on `angie-social-portal` production** (P1 for Studio HD/remove-bg)
- [ ] ⚠️ Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` mirroring KV equivalents (or refactor auth-store) for durable signups
- [ ] 🧹 Delete orphan `ANTHROPIC_API_KEY` from `thepostpal-readable-v2`
- [ ] After any env change: `vercel deploy --prod -y` so runtime picks up the new values
