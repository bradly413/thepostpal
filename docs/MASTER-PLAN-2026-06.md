# Posterboy Social — Master Plan (multi-agent synthesis)

**Date:** 2026-06 (living document)  
**Purpose:** Single coordination spine for **Claude**, **Gemini**, **Codex**, and **Cursor** plans.  
**Canonical repo:** `~/Desktop/ventures/thepostpal/`  
**Production:** https://www.posterboysocial.com · Vercel `angie-social-portal` · Neon Postgres + RLS  

**Read first:** `docs/AGENT-HANDOFF-2026-06-03.md` → `CLAUDE.md` → this file.

---

## 1. North star

**Product:** Calm, approval-first social for local businesses — *“The week is drafted. Approve it and go back to work.”*  
**Moat:** Draft → **Press** → **Dispatch** (+ optional **Issues**), not creator analytics or comment inbox.  
**Commercial (GTM truth):** **Solo** $99/mo · **Command** $249/mo + $39/location (`house_account` in DB).  
**Engineering truth:** One multi-tenant Postgres stack; **no second auth model**; extend `dashboard-api.ts`, don’t fork stores.

---

## 2. Current state snapshot (Cursor synthesis)

| Layer | Status |
|-------|--------|
| **Prod backend** | Live: RLS, `/api/me`, locations, posts, photos, calendar, brand-book, Stripe webhooks (code), Meta OAuth/publish |
| **Plan gating** | `plan-features.ts` + `PlanProvider`; Solo vs Command surfaces |
| **Client data** | Core dashboard on `dashboard-api.ts` + `StateViews` + `useActiveLocation` |
| **localStorage purge** | Done (Cursor): `organization-store`, `issues-store`, `drafts-store`, `brand-intake`, `dashboard-data-init` removed; `/api/issues`, org page on API |
| **Remaining legacy stores** | `schedule-store.ts`, `events-store.ts` (types only), `meta-store.ts` (stub), `auth-store`, `knowledge-store`, `feedback-store`, `app-settings` on settings page |
| **In-flight branches** | `feature/meta-ads` (Command + `META_ADS_ENABLED`, paused-only Marketing API) |
| **New pipelines** | `POST /api/images/generate` (brandEngine + geography augmentation), `POST /api/upload/presigned`, `POST /api/posts/generate` (caption DNA) |
| **UI ownership** | **Claude:** dashboard home / marketing polish · **Codex:** S3 + AI route hardening · **Cursor:** backend, migrations, store deletion, API wiring |

**Stale docs to ignore:** Claims that prod is still May `main` without RLS, or that all state is localStorage (`POSTERBOY-MASTER-BRIEF.md` §3–5 partial).

---

## 3. Architecture (non-negotiables)

### Tenancy
```
requireAuthContext() → withTenantDb(auth, fn) → resolveAccess(userId, locationId, tx) → 403
```
- JWT session (`jose`); `tenantId` = `organizationId`.
- RLS via `app.current_tenant_id` per transaction (`src/lib/db.ts`).

### Client layer
| Module | Role |
|--------|------|
| `src/lib/dashboard-api.ts` | Typed fetch; `DashboardApiError` |
| `src/lib/dashboard-browser-state.ts` | Active `locationId` only |
| `src/components/dashboard/StateViews.tsx` | Skeleton / Empty / Error / NoLocation |
| `src/lib/use-active-location.ts` | Location resolution for scoped pages |

### Plans
- **Command** = `house_account` (no `command` enum).
- `GET /api/me` = live plan + `organization` profile (extended).
- Feature flags: `src/lib/plan-features.ts` (`metaAds` requires `META_ADS_ENABLED=true`).

### Prisma
- Always `npx prisma generate` after schema changes; build = `prisma generate && next build`.

---

## 4. Multi-agent division of labor

Use this table when merging plans from Claude / Gemini / Codex / Cursor.

| Domain | Primary owner | Secondary | Do not |
|--------|---------------|-----------|--------|
| **Dashboard home / bento UX** | Claude | Cursor (API only) | Cursor: `src/components/dashboard/home/`, `DashboardHome.tsx` |
| **Marketing / onboarding UI** | Claude | — | Break plan gating |
| **S3 uploads + presigned flow** | Codex | Cursor (auth/RLS) | Ephemeral `public/uploads` in prod without env |
| **AI routes** (`/api/ai`, enhance, captions, images) | Codex + Cursor | Claude (UI) | Hardcode Angie brand book in `/api/ai` |
| **Backend routes, Prisma, RLS migrations** | Cursor | Codex | Apply prod migrations without Brad |
| **Meta Ads / Marketing API** | Cursor | Brad (App Review) | Auto-live ad spend |
| **Stripe / billing** | Cursor + Brad (env) | Codex | Agents set Vercel prod env |
| **Store deletion / API migration** | Cursor | — | Reintroduce `*-store.ts` CRUD |
| **QA / smoke / deploy** | Brad | Cursor scripts | Force-push `main` |

**Merge rule:** One PR per vertical; end commits with `Co-Authored-By:`; grep zero for deleted stores before merge.

---

## 5. Workstreams & phases

### Phase A — Production hardening (P0, ~1 day, Brad + any agent)

| # | Task | Owner | Done when |
|---|------|-------|-----------|
| A1 | UI smoke on prod: demo Solo surface, fresh signup, post/calendar/photo persist | Brad | Checklist in `docs/PLAN-2026-06-04.md` |
| A2 | Flip demo org to `house_account` → Command UI → revert | Brad | Switcher + approvals visible |
| A3 | `./scripts/smoke-prod.sh` green after env changes | Cursor/Brad | 9/9 checks |
| A4 | Rotate Neon password if ever exposed in chat | Brad | `DATABASE_URL` updated on Vercel |

### Phase B — Durable infra (P1, beta-critical)

| # | Task | Owner | Done when |
|---|------|-------|-----------|
| B1 | Upstash: `UPSTASH_REDIS_REST_*` (or KV aliases) | Brad | Signups survive redeploy |
| B2 | S3: bucket + keys + `S3_PUBLIC_BASE_URL` | Codex + Brad | `storage: "s3"` on upload; photos survive deploy |
| B3 | Wire editor + studio to presigned upload path | Codex | No localStorage photo blobs in editor |
| B4 | `NEXT_PUBLIC_APP_URL=https://www.posterboysocial.com` | Brad | OAuth redirects correct |
| B5 | Photo delete → S3 object delete (optional P1.5) | Codex | Documented in `uploads-storage.md` |

### Phase C — Data layer completion (engineering)

| # | Task | Status | Notes |
|---|------|--------|-------|
| C1 | Delete `schedule-store` / `events-store` CRUD; extract types to `dashboard-view-types.ts` | Partial | See `docs/MIGRATION-LOCALSTORAGE-TO-DASHBOARD-API.md` Phase 0 |
| C2 | Editor photos → API only (`use-dashboard-photos`, presigned upload) | Partial | Codex + Cursor |
| C3 | Analytics/reports/dispatch/social: `StateViews` polish | Partial | Cursor |
| C4 | Issues + org on API | **Done** | `GET /api/issues`, org page |
| C5 | `/api/ai` reads `GET /api/brand-book` per location | Open | High impact for multi-vertical |
| C6 | `Organization.brandEngine` wired end-to-end (onboarding save + image/caption routes) | Partial | Architect UI + `posts/generate` + `images/generate` |

### Phase D — Growth features (post-beta)

| # | Task | Branch / gate |
|---|------|----------------|
| D1 | Meta Ads builder | `feature/meta-ads` + App Review + `META_ADS_ENABLED` |
| D2 | Meta publish with public image URLs (S3) | Depends on B2 |
| D3 | Voice refresh from Meta history UI | API exists (`/api/meta/voice-samples`) |
| D4 | Stripe live checkout (if charging in beta) | Brad env |
| D5 | Sentry + publish cron monitoring | `launch-critical-workstreams.md` |
| D6 | Enterprise SSO | Sales only, not beta |

### Phase E — Brand & marketing (Claude-led)

| # | Task |
|---|------|
| E1 | Mobile QA `/`, `/sign-in`, pricing footer |
| E2 | Brand Architect onboarding → persists `brandEngine` + brand book API |
| E3 | `/dashboard/brand` as voice hub (replaces brand-intake) |
| E4 | Trademark / legal surfaces |

---

## 6. API inventory (tenant-scoped unless noted)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/me` | Plan, role, org profile |
| `GET/POST /api/locations` | Locations + create |
| `GET/POST /api/posts`, `/api/posts/[id]/*` | Content queue + approvals |
| `POST /api/posts/generate` | Caption with brandEngine DNA |
| `GET/POST /api/photos` | Photo library |
| `GET/POST /api/calendar` | Calendar events |
| `GET/PUT /api/brand-book` | Brand voice JSON |
| `GET /api/issues` | Weekly issues + stats |
| `POST /api/images/generate` | Gemini image + geo/brand augmentation |
| `POST /api/generate-image` | Legacy unauthenticated/simple image |
| `POST /api/upload`, `/api/upload/presigned` | Media storage |
| `POST /api/meta/*`, `/api/meta/ads/*` | Organic + ads OAuth |
| `POST /api/webhooks/stripe` | Billing (auth-exempt) |
| `POST /api/auth`, `/api/auth/signup` | Auth |

**Client helper:** extend only `dashboard-api.ts` (e.g. `generateDashboardImage`, `fetchDashboardIssues`).

---

## 7. Environment matrix

| Variable | Prod status | Blocks |
|----------|-------------|--------|
| `DATABASE_URL` | Set | Everything |
| `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Set | Auth, AI, images |
| `META_*` | Set | Publish (needs public URLs) |
| `UPSTASH_*` / `KV_*` | Often missing | Durable signups |
| `S3_*`, `AWS_*` | Often missing | Durable uploads, Meta images |
| `STRIPE_*` | Often missing | Paid checkout |
| `LEONARDO_API_KEY` | Missing | Studio HD |
| `NEXT_PUBLIC_APP_URL` | Often missing | OAuth canonical URL |
| `META_ADS_ENABLED` | Off by default | Ads builder |

Reference: `docs/PROD-ENV-CHECKLIST.md`, `docs/PROD-DB-SETUP.md`.

---

## 8. Beta gates (July 2026 cohort)

**Target:** 15 Solo + 5 Command tenants.

| Gate | Requirement |
|------|-------------|
| Tenant isolation | RLS smoke + manual two-tenant test |
| Signup → onboarding → dashboard | Brand Architect completes; DB location exists |
| Content persistence | Posts, calendar, photos survive reload (S3 for photos) |
| Solo surface | No switcher; Schedule not Submit |
| Command surface | Switcher, approvals, org roll-up |
| Billing | Stripe test OR explicit “free beta” decision |
| Runbook | `docs/BETA-TESTER-INSTRUCTIONS.md` updated |

---

## 9. Risks & decisions

| Risk | Mitigation |
|------|------------|
| Parallel agents edit same files | Declare owner per path; rebase before commit |
| Stale Prisma client on Vercel | Never remove `prisma generate` from build |
| Agent cannot set prod env | Brad runs Vercel; agents draft commands only |
| `gh pr create` wrong user | Browser PR or fix CLI auth |
| Meta without public image URLs | S3 required for real publish |
| Geographic wrong AI images | Use `/api/images/generate` not raw `/api/generate-image` |
| Ads spend liability | All Meta entities `PAUSED`; no auto-launch |

**Open decisions for Brad**

1. Charge during beta or Stripe later?  
2. Merge `feature/meta-ads` before or after beta?  
3. Single repo only (`thepostpal`) — retire `thepostpal-readable-v2` Vercel project?  
4. Demo tenant: server-seed Issues rows or empty state OK?

---

## 10. How to combine external agent plans

When Claude / Gemini / Codex / Cursor each produce a plan:

1. **Map every task** to a workstream ID (A–E) and **primary owner** (§4).  
2. **Drop duplicates** already marked Done in §2.  
3. **Flag conflicts** (e.g. two agents touching `dashboard-api.ts` → sequence PRs).  
4. **Respect forbidden zones** (dashboard home → Claude only).  
5. **Sort by**: A → B → C → D → E for beta; defer D6/E4.  
6. **Attach verification**: `tsc`, `build`, `smoke-prod.sh`, and UI checklist from `PLAN-2026-06-04.md`.

**Suggested weekly rhythm**

| Day | Focus |
|-----|--------|
| Mon | P0 validation + env (A, B) |
| Tue–Wed | S3 + editor + AI brand context (B, C5) |
| Thu | Store cleanup Phase 0–2 (C1–C3) |
| Fri | PR merge, smoke, beta comms (E) |

---

## 11. Document index (source of truth by topic)

| Topic | Doc |
|-------|-----|
| Cold agent start | `AGENT-HANDOFF-2026-06-03.md` |
| Tomorrow checklist | `PLAN-2026-06-04.md` |
| localStorage migration detail | `MIGRATION-LOCALSTORAGE-TO-DASHBOARD-API.md` |
| Commercial | `BUSINESS-PLAN-2026-06.md`, `BUSINESS-PLAN-ALIGNMENT-2026-06.md` |
| Ops agent fleet | `AGENT-FLEET-PLAN.md` |
| Meta Ads PR | `META-ADS-PR-CHECKLIST.md` |
| S3 | `uploads-storage.md` |
| Stripe | `stripe-billing-setup.md` |
| Codex depth | `CODEX-HANDOFF.md` |

---

## 12. Verification commands (all agents)

```bash
cd ~/Desktop/ventures/thepostpal
npx prisma generate
npx tsc --noEmit
npm run build
./scripts/smoke-prod.sh   # optional, prod URL
rg 'organization-store|issues-store|drafts-store' src/   # must be empty
```

---

*This plan is maintained by Cursor synthesis; update §2 when major branches merge or stores are deleted.*
