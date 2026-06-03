# Codex brief — Meta Ads (Marketing API) integration

**Owner agent:** Codex · **Requested by:** Brad · **Date:** 2026-06-03
**Goal:** Let Posterboy users create & manage Facebook/Instagram **ads** (not just organic posts) from inside the app, linked to their connected Page + ad account.

---

## 0. READ FIRST — get caught up
Before touching anything, read these in order (they are the source of truth; `CLAUDE.md` repo map is partly stale where it conflicts):
1. **`docs/AGENT-HANDOFF-2026-06-03.md`** — current production state, architecture (auth/tenancy/RLS), plan tiers, gotchas. **Most important.**
2. **`CLAUDE.md`** — repo map + commands.
3. **`src/lib/meta.ts`**, `src/app/api/meta/*` — the existing (organic publishing) Meta integration you'll extend.
4. **`prisma/schema.prisma`** + `src/lib/db.ts` (`withTenantDb`) + `src/lib/api-auth.ts` (`requireAuthContext`) + `src/lib/authz.ts` (`resolveAccess`) — the tenant/RLS pattern **every new route must follow**.

### One-paragraph project context
Posterboy Social is a live (posterboysocial.com) multi-tenant SaaS: Next.js 16 + React 19 + Prisma/**Neon Postgres with app-managed RLS**. Auth is a JWT session cookie; `requireAuthContext()` → `withTenantDb(auth, fn)` sets `app.current_tenant_id` per transaction so RLS isolates tenants. Plans are **Solo** (single-location, streamlined) vs **Command** = Prisma `house_account` (multi-location, full surface) — gated in `src/lib/plan-features.ts`. Meta is currently **organic only** (scopes: `pages_manage_posts`, `instagram_content_publish`, etc.). This task adds the **ads** capability.

---

## 1. Lane discipline (avoid collisions — Claude is editing the dashboard UI in parallel)
- Work on branch **`feature/meta-ads`** off latest `main`.
- **New files only** where possible. **Do NOT touch:** `src/components/dashboard/home/DashboardHome.tsx`, `src/components/dashboard/home/dashboard-home-styles.tsx`, or anything under `src/components/dashboard/home/` (active UI work).
- Don't push to `main` / deploy — open a PR; Brad merges. (Production deploys are human-triggered.)
- Reuse the existing client/data patterns (`src/lib/dashboard-api.ts`, `StateViews.tsx`) — extend, don't fork.

## 2. What this is (and isn't)
- **Not** a single "ad center API key." Ads use the **Meta Marketing API**, on the *same* Meta App already configured (`META_APP_ID`/`NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`), with **additional OAuth scopes** + Meta approval.
- **Money:** never handle ad spend. Meta bills the **user's own ad account**. Everything we create is **PAUSED** by default — the user activates in-app or in Ads Manager. Never auto-launch a spending ad.

## 3. Brad's responsibilities (you cannot do these — note them, build behind a flag)
- **Meta Business Verification** + **App Review / Advanced Access** for `ads_management` and `ads_read`.
- Any prod env (agents are harness-blocked from `vercel env *`). You may *document* needed env.
- **S3 / hosted image storage** must be live before real ad creatives work (creatives need public image URLs). It's on `docs/PLAN-2026-06-04.md`.
→ Therefore: **ship behind a feature flag, fully testable in dev**, ready to flip on once Meta approves + S3 is set.

## 4. Build plan

### 4a. Scopes (src/lib/meta.ts)
Add to `SCOPES`: `ads_management`, `ads_read` (and `business_management` if needed for ad-account discovery). Keep a separate `ADS_SCOPES` constant and only request the extra scopes when a user opts into ads (incremental auth), so organic-only users aren't forced through ads consent.

### 4b. Ad-account discovery
After OAuth with ads scope: `GET /me/adaccounts?fields=name,account_id,currency,account_status,business`. Let the user pick which ad account to use per location.

### 4c. Persistence (Prisma)
- Add a model (suggest `MetaAdAccount`: `organizationId`, `locationId?`, `adAccountId` (act_<id>), `name`, `currency`, `accessTokenRef`, timestamps) **with RLS** — follow the policy pattern in migration `20260602193000_enable_rls_multi_tenant` for any new tenant table. Optionally persist launched campaigns (`MetaAdCampaign`) for in-app listing; Meta can also be source of truth for v1.
- After `schema.prisma` changes: `npx prisma migrate dev` locally; **the build already runs `prisma generate`** — do not remove it.

### 4d. Marketing API client — `src/lib/meta-ads.ts` (new)
Use `GRAPH = https://graph.facebook.com/v25.0` (match `meta.ts`). Functions:
- `listAdAccounts(userToken)`
- `createCampaign(adAccountId, token, { name, objective, status:'PAUSED', special_ad_categories:[] })`
- `createAdSet(adAccountId, token, { name, campaignId, dailyBudgetCents, billingEvent, optimizationGoal, targeting, startTime, endTime, status:'PAUSED' })`
- `uploadAdImage(adAccountId, token, imageUrl)` → returns `image_hash` (POST `act_<id>/adimages`)
- `createAdCreative(adAccountId, token, { name, pageId, message, link, imageHash, callToAction })` (object_story_spec)
- `createAd(adAccountId, token, { name, adSetId, creativeId, status:'PAUSED' })`
- `getAdInsights(adAccountId, token, { level, datePreset })` (ads_read)

### 4e. API routes (tenant-scoped; mirror `requireAuthContext → withTenantDb → resolveAccess(userId, locationId, tx) → 403`)
- `GET  /api/meta/ad-accounts` — list the connected user's ad accounts
- `POST /api/meta/ads/launch` — orchestrates campaign → adset → creative → ad (all PAUSED) from one form payload (locationId, adAccountId, objective, budget, schedule, targeting, creative {photoId|url, message, link, cta})
- (optional granular) `POST /api/meta/ads/{campaign,adset,creative,ad}`
- `GET  /api/meta/ads/insights` — performance read
All gated: 403 if the user lacks access to the location; reject if feature flag/plan disallows.

### 4f. UI — `src/app/dashboard/ads/page.tsx` (new)
Ad builder: pick ad account → objective → budget + schedule → audience (geo/age/interests, start simple) → creative (select from the photo library `/api/photos`, message, link, CTA) → **preview** → **Launch (Paused)**. Use `useActiveLocation`, `dashboard-api` client style, `StateViews` for loading/empty/error. Add a "Boost as ad" entry point from an existing post where natural. Keep copy minimal/calm (no emojis — house rule).

### 4g. Gating / feature flag
- Add `metaAds: boolean` to `PlanFeatures` in `src/lib/plan-features.ts` (suggest **Command-only** to start) **and** an env/runtime flag `META_ADS_ENABLED` so it stays dark until Meta approves. Hide the nav entry + 404/redirect the route when off.

## 5. Acceptance criteria
- With the flag on + a connected ad account (dev/test), a user can fill the builder and **launch a PAUSED campaign** that appears in their Meta Ads Manager.
- Everything created is **PAUSED** (no auto-spend). No ad-spend money flows through Posterboy.
- Routes are tenant-isolated (RLS pattern) and 403 on cross-tenant/foreign-location access.
- Insights read returns data.
- `npx tsc --noEmit` clean; `npm run build` clean (keep `prisma generate &&`).
- Feature is invisible when the flag is off. Organic publishing is unaffected.
- PR opened against `main` with a short test plan; **do not merge/deploy** — Brad does.

## 6. App Review checklist (for Brad, include in PR description)
- App in **Live** mode; valid Privacy Policy URL.
- **Business Verification** complete.
- Request **Advanced Access**: `ads_management`, `ads_read` (+ `business_management` if used).
- Screencast of the in-app ad-creation flow + written use case.
- Test users / ad account for Meta reviewers.

## 7. Gotchas (from the handoff — don't relearn these)
1. `prisma generate` **must** stay in the build (`package.json` build = `prisma generate && next build`). Stale client = failed Vercel deploy.
2. Local `tsc`/build passing ≠ Vercel passing if the Prisma client is stale — regenerate after schema edits.
3. Agents can't `vercel env *` for production — document env, Brad sets it.
4. `gh pr create` fails (CLI authed as wrong account) — open the PR in browser or have Brad do it. `git push` works.
5. After a PR merge, `main` is a merge commit — sync `origin/main` into your branch, don't force-push.

---
**Deliverable:** `feature/meta-ads` branch + PR: scopes, `meta-ads.ts`, the routes, the builder UI, the Prisma model + RLS migration, plan/flag gating, and the App Review checklist in the PR body — all behind the flag, dev-testable, deploy-ready once Meta approves + S3 is live.
