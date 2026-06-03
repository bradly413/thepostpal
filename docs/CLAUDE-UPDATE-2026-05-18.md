# Claude update — Solo/Command sprint + brand book DB wire-up

**Date:** 2026-05-18  
**Repo:** `~/Desktop/ventures/thepostpal/` (canonical — ignore `~/Code/thepostpal-readable-v2/`)  
**Branch:** `pricing/solo-command-june-2026` (`origin` at `d7e949b`; 2 newer commits are **local-only**; **not merged to `main`**)  
**HEAD (committed):** `1646677` — *chore: add db:studio script* — but **`origin` is still at `d7e949b`**  
**Committed since the May 18 pass (NOT pushed):** `3884b0e` marketing calendar grid lines · `1646677` `db:studio` script  
**Working tree:** brand book API + client wire-up is **local, uncommitted** (see file list below)  
**Local preview:** `npm run dev` → `http://127.0.0.1:8240/` · Prisma Studio: `npm run db:studio` → `:5555`  
**Demo login:** `/sign-in` — `demo` / `demo123`  
**Last reconciled:** 2026-06-02 (facts re-verified against the branch)  
**PR (manual):** https://github.com/bradly413/thepostpal/compare/main...pricing/solo-command-june-2026?expand=1

Paste the **Context prompt** section into a new Claude Code thread to continue from this state.

---

## Context prompt (paste below)

You are continuing **Posterboy Social** engineering in:

```bash
cd ~/Desktop/ventures/thepostpal
git checkout pricing/solo-command-june-2026
export $(grep -h '^DATABASE_URL=' .env.local | sed 's/"//g')
npm run dev   # http://127.0.0.1:8240
```

**Read first:** `AGENTS.md`, `CLAUDE.md`, this file, `docs/BUSINESS-PLAN-ALIGNMENT-2026-06.md`, `docs/stripe-billing-setup.md`, `prisma/schema.prisma`.

### Stack & conventions

- Next.js **16.2.6**, React 19, Prisma + Postgres with **RLS** via `withTenantDb()`
- Auth: `requireAuthContext()` → tenant-scoped APIs
- Location access: `requireLocationAccess(locationId)`
- Plan gating: `resolveAccess()`, `src/lib/pricing.ts` (Solo $99 / Command $249 + $39/location)
- Before calling work done: `npx tsc --noEmit` && `npm run build`
- **Do not push or commit** unless Brad explicitly asks
- Commit trailer when committing: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### What this branch already shipped (committed)

| Area | Summary | Key paths |
|------|---------|-----------|
| Pricing & docs | Solo/Command tiers, marketing alignment | `src/lib/pricing.ts`, `docs/BUSINESS-PLAN-2026-06.md` |
| Dashboard API | Posts, calendar, photos, drafts, bento, analytics helpers | `src/lib/dashboard-api.ts`, `src/lib/scheduled-post-mappers.ts` |
| Scheduled posts | `templateId`, `pillar` on `ScheduledPost` | migration `20260602181254_add_metadata_to_scheduled_posts` |
| Signup / limits | Plan from sign-in → provisioning; Solo 3-profile cap | `src/lib/tenant-provisioning.ts`, `src/lib/social-profile-limits.ts` |
| Stripe (code) | Checkout, webhook, portal, `Subscription` persistence | `src/lib/stripe-billing.ts`, `docs/stripe-billing-setup.md` |
| Meta → DB | `SocialConnection` per location; OAuth callback persists tokens | `src/lib/meta-social-db.ts`, `useMetaConnection()` |
| Uploads | Env-gated S3 with local fallback | `src/lib/storage.ts` (commits `3828a25`/`d7e949b`); config doc `docs/uploads-storage.md` |
| Webhook routing | `/api/webhooks` exempted from auth middleware so Stripe webhooks reach the handler (would 307→/sign-in otherwise) | `src/proxy.ts` (`492452e`) |
| Tooling / docs | `npm run db:studio` (Prisma Studio :5555); Cursor handoff | `package.json` (`1646677`), `docs/CURSOR-HANDOFF.md` |

**Production is still on `main` until this branch merges.**

### Brand book — wired to DB (local changes, May 18)

Previously the brand book lived only in `localStorage` (`postpal-brand-book`). It now persists to the tenant database.

#### Storage model

- Full document in **`Location.brandVoiceJson`** (no new migration):

```ts
{ version: 1, brandBook: BrandBook, onboardingAnswers?: OnboardingAnswers }
```

- Also syncs **`BrandKit`**, **`BrandVoiceProfile`**, and location color/font fields from palette/voice on save.
- Legacy `{ tone, audience, ... }` JSON on locations still parses for dashboard home tone line.

#### New / updated files

| File | Role |
|------|------|
| `src/lib/brand-book-document.ts` | Parse/validate stored JSON; legacy compat |
| `src/lib/brand-book-db.ts` | Server load/save + kit/voice upsert |
| `src/app/api/brand-book/route.ts` | `GET` (status + book), `PUT` (persist) |
| `src/lib/brand-book-client.ts` | `persistBrandBookToWorkspace()`, `fetchHasBrandBookFromApi()` |
| `src/lib/use-brand-book.ts` | Dashboard brand page hook |
| `src/lib/dashboard-api.ts` | `fetchDashboardBrandBook`, `saveDashboardBrandBook` |

#### Wired flows

1. **Onboarding approve** (`src/app/onboarding/page.tsx`) → `PUT /api/brand-book` with first active location, then `syncBrandBookToOrganization()` (legacy localStorage org still runs).
2. **`/dashboard/brand`** → `useBrandBook()` loads from API (localStorage is cache only).
3. **Sign-in routing** → if no local book/org flag, `GET /api/brand-book` decides onboarding vs dashboard.
4. **`ensureDashboardData()`** → hydrates org from API when localStorage empty.

#### API contract

```http
GET /api/brand-book
GET /api/brand-book?locationId=<id>
→ { hasBrandBook, locationId, brandBook, onboardingAnswers? }

PUT /api/brand-book
Body: { locationId, brandBook, onboardingAnswers? }
→ { hasBrandBook, locationId, brandBook }
```

Existing generate routes unchanged:

- `POST /api/brand-book/generate`
- `POST /api/brand-book/refresh-voice` (still stateless; does not auto-persist — optional follow-up)

#### Verify brand book

1. Sign in as demo, complete onboarding approve (or PUT via devtools).
2. Refresh `/dashboard/brand` — book should load without relying on localStorage alone.
3. Clear `postpal-brand-book` in DevTools, reload brand page — should still load from DB.
4. New browser session after login should skip onboarding if book exists in DB.

### Still localStorage / not done

| Item | Notes |
|------|--------|
| `organization-store` | Org page, `syncBrandBookToOrganization` |
| `posterboy-onboarding-complete` | Onboarding-done flag still browser-only |
| `issues-store`, `app-settings` | Secondary debt |
| Stripe / Meta in prod | Need env vars + Dashboard products + reconnect per location |
| Auth store prod | Upstash for `auth-store.ts` on Vercel |
| AI route brand context | `/api/ai` still uses hardcoded `angieNicholsBrandBook` — should read tenant book |
| Brand book commit | May 18 wire-up files are **uncommitted** on branch |

### Git status snapshot (brand book pass)

```text
 M src/app/dashboard/brand/page.tsx
 M src/app/dashboard/organization/page.tsx
 M src/app/onboarding/page.tsx
 M src/app/sign-in/page.tsx
 M src/lib/dashboard-api.ts
 M src/lib/dashboard-data-init.ts
 M src/lib/dashboard-home-data.ts
 M src/lib/onboarding-brand-sync.ts
?? src/app/api/brand-book/route.ts
?? src/lib/brand-book-client.ts
?? src/lib/brand-book-db.ts
?? src/lib/brand-book-document.ts
?? src/lib/use-brand-book.ts
```

### Next steps (recommended order)

1. **Push** the 2 local-only commits (`3884b0e`, `1646677`) — `origin` is behind HEAD by these.
2. **Commit** brand book wire-up on `pricing/solo-command-june-2026` (if Brad wants).
3. **Merge branch → `main`** for production deploy.
3. Wire **`/api/ai`** (and caption flows) to `GET /api/brand-book` per active location.
4. Optionally persist **`refresh-voice`** results back through `PUT /api/brand-book`.
5. Migrate **`organization-store`** off localStorage or drop demo seed when API org exists.
6. Production: Stripe keys, Meta app, Upstash auth — see `docs/stripe-billing-setup.md`.

### Files to inspect first

- `src/app/api/brand-book/route.ts`
- `src/lib/brand-book-db.ts`
- `src/lib/brand-book-document.ts`
- `src/lib/brand-book-client.ts`
- `src/app/onboarding/page.tsx` (`handleApprove`)
- `src/app/dashboard/brand/page.tsx`
- `src/lib/onboarding-brand-sync.ts`

### Important cautions

- Do not store secrets in docs or commits; `.env.local` stays local.
- `brandVoiceJson` name is historical — it holds the **full** brand book document, not just voice summary.
- `requireLocationAccess` on `GET` with `locationId` still falls back to any tenant location that has a book (`findTenantBrandBook`).
- Do not revert to localStorage-only brand book without a migration path for existing demo tenants.

---

## Short summary

**Branch `pricing/solo-command-june-2026`** is the engineering line for Solo/Command pricing, RLS-backed dashboard APIs, Stripe billing code, Meta OAuth → DB, and S3 uploads.

**May 18 add-on (uncommitted):** brand book persists to **`Location.brandVoiceJson`** via **`GET/PUT /api/brand-book`**, with onboarding, sign-in, and `/dashboard/brand` wired to the API. localStorage remains a cache and org-sync shim.

**To go live:** merge to `main`, set production env (Stripe, Meta, Upstash, DB), reconnect Meta per location.
