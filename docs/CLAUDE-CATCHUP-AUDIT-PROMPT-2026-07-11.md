# Claude: Catch Up on Posterboy Social, Then Run Your Own Audit

Paste this entire document into a new Claude session. **Part A** rebuilds context; **Part B** is a read-only audit (no code changes until Brad approves fixes).

---

## Part A — Catch up (verify everything in code; don’t trust this doc blindly)

### What this product is

**Posterboy Social** — multi-tenant social content SaaS for local businesses and agencies (real estate, restaurants, etc.). Brand site: https://www.posterboysocial.com

- **Solo** plan: single location, streamlined UI
- **Command** plan (`house_account` in Prisma): multi-location switcher, roll-ups, approvals, per-brand Meta connect

Brad uses it in production for **TRC** (separate workspace from demo). Demo account is for testing only.

### Stack (current)

| Layer | Tech |
|-------|------|
| Framework | **Next.js 16.2.6** App Router, Turbopack — **read `node_modules/next/dist/docs/` before App Router work; APIs differ from Next 15** |
| UI | React 19, TypeScript, Tailwind v4, GSAP 3.15 |
| DB | **Neon Postgres + Prisma + app-managed RLS** (`withTenantDb`, `app.current_tenant_id`) |
| Auth | httpOnly JWT cookie (`jose`), `requireAuthContext()` |
| Deploy | Vercel project **`angie-social-portal`** — `main` auto-deploys prod |
| Repo | GitHub `bradly413/thepostpal` — this checkout: `thepostpal-readable-v2` |

### Run locally

```bash
cd ~/Code/thepostpal-readable-v2   # or canonical ~/Desktop/ventures/thepostpal
export $(grep -h '^DATABASE_URL=' .env.local | sed 's/"//g')
npm run dev                        # http://127.0.0.1:8240 (port may vary)
```

Login: `/sign-in` — **`demo` / `demo123`** → tenant `demo-org`, org name **Demo Workspace**

### Non-obvious gotchas (will bite you)

1. **Middleware file is `src/proxy.ts`** (Next 16 convention), not `middleware.ts`
2. **Design system is warm-light** — frosted glass, brand red `#ee2532`. **Retired:** dark/gold (`#D4A853`, `bg-[#0c0c0e]`)
3. **Serif font is logo-only** — never on page titles
4. **`prisma generate` required** after schema changes and in Vercel build
5. **Agents cannot set Vercel prod env** — Brad sets prod secrets
6. **`gh pr create` may fail** (CLI auth as `brn4040-prog`) — browser PR works; `git push` works
7. **Demo vs real accounts are separate tenants** — posts in `demo-org` do not appear in email-signup workspaces (e.g. TRC)
8. **localStorage legacy** still exists in some routes — see `*-store.ts` files; calendar/home/drafts are DB-backed
9. **Auth store** may be ephemeral without Upstash — signups can vanish on redeploy
10. **Uploads** ephemeral without S3 — photos can vanish on redeploy

### Canonical docs (read in order)

1. `CLAUDE.md` / `AGENTS.md`
2. `docs/AGENT-HANDOFF-2026-06-03.md`
3. `docs/PLAN-2026-06-04.md`
4. `docs/PROD-ENV-CHECKLIST.md`
5. `docs/CLOSED-BETA-SECURITY-AUDIT-2026-06-09.md`
6. Prior UI audits: `docs/AUDIT-2026-06-11.md`, `docs/AUDIT-2026-06-12.md`

### Git state as of 2026-07-11 (verify with `git log` / `git status`)

**On `main`, pushed to origin.**

| Commit | Summary |
|--------|---------|
| `0304744` | Bulk scheduler rebuild, dynamic holiday slides, calendar spacing, per-brand Meta OAuth + page picker |
| `4de34ef` | Warm-light dashboard chrome, mobile nav, E2E, typography, loading states |

**Uncommitted local work (may exist when you start):**

- Home **Posts This Week** — local timezone fix (`dashboard-post-helpers.ts`)
- Home **third module: Next Up** (fallback when weather geo missing) — `DashboardHome.tsx`
- Unit tests for weekly overview

Run `git status` first.

### Architecture essentials

```
Session → requireAuthContext() → { userId, tenantId, role, isSuperadmin }
         → withTenantDb(auth, fn) → RLS-scoped Prisma tx
         → resolveAccess(userId, locationId, tx) for location routes
```

**Client data layer (extend, don’t fork):**

- `src/lib/dashboard-api.ts` — typed API client
- `src/lib/dashboard-browser-state.ts` — active location id
- `src/components/dashboard/StateViews.tsx` — Skeleton / Empty / Error / NoLocation
- `src/lib/use-active-location.ts` + `ActiveLocationProvider` in dashboard layout

**Plan gating:** `PlanProvider` + `usePlan()` from `src/lib/plan-features.ts`

### Key routes (dashboard)

| Route | Backend | Notes |
|-------|---------|-------|
| `/dashboard` | API home snapshot | `loadDashboardHomeSnapshot()` |
| `/dashboard/calendar` | API + bulk scheduler | DB posts/events |
| `/dashboard/drafts`, `/photos` | API | DB-backed |
| `/dashboard/brand` | Brand book API | `brandVoiceJson` per location |
| `/dashboard/organization` | API | Command: per-brand Meta connect rows |
| `/dashboard/connect/meta` | OAuth pending | Facebook Page picker (2+ pages) |
| `/dashboard/studio` | Gemini + Leonardo | Particle reveal |
| `/dashboard/editor`, `/dispatch`, `/analytics`, `/reports`, `/facebook`, `/instagram` | **Partly localStorage** — migration incomplete |

### Meta / agency (Envision-style)

- One **location** = one brand
- OAuth: `/api/auth/meta/login` → callback → auto-connect (1 page) or picker
- Organization page: `BrandMetaConnectionRow` per location
- Legacy `/api/meta/callback` mirrors auth callback for old redirect URIs
- **Not built:** inbox/DMs, personal profiles, Sprout-style channel grid

### Recent session decisions (don’t re-litigate)

- Bulk captions: **manual only** on upload (no auto-caption on upload)
- Tone chips: Short, Excited, Corporate, Casual, Warm
- Holiday hero carousel: dynamic from `src/lib/holidays.ts` + `hero-holiday-slides.ts`
- Home **Posts This Week** counts posts on **local calendar days** this week (scheduled/approved/published)
- **31 scheduled** in queue ≠ **13 this week** — future weeks are expected

### Verification commands

```bash
npm run test
npx tsc --noEmit
prisma generate && npm run build
./scripts/smoke-prod.sh          # prod API smoke (needs network)
npx vercel ls angie-social-portal --scope bradly413s-projects
```

### Brad-only prod config gaps (degrade gracefully today)

- `NEXT_PUBLIC_APP_URL` — OAuth canonical base
- `UPSTASH_REDIS_*` — durable auth/signups
- `S3_*` — durable uploads
- `TOKEN_ENC_KEY` — Meta token encryption
- Stripe, Leonardo — optional

---

## Part B — Your audit (read-only; report only)

**Do not change code in this pass.** Produce a findings document Brad can approve before fixes.

### 1. Rebuild mental model (1–2 hours)

- [ ] Read gotcha docs above; confirm `src/proxy.ts`, plan features, tenancy flow
- [ ] Map `src/app/dashboard/**` pages to API vs localStorage
- [ ] Trace auth: demo login, email signup, tenant provisioning
- [ ] Run `npm run test` + `tsc` — note failures
- [ ] If prod access: `./scripts/smoke-prod.sh` + spot-check https://www.posterboysocial.com/sign-in

### 2. Live UI pass (prod + local if possible)

Sign in as **demo/demo123** and a **fresh signup** (if available). Check:

| Surface | What to verify |
|---------|----------------|
| Home | Posts This Week, Your Week rail, Next Up/Weather third module, queue counts align with Calendar |
| Calendar | Spacing, bulk scheduler, manual captions, holiday rail |
| Studio | Publish flow, preview overlap (see AUDIT-2026-06-12 R2) |
| Organization (Command) | Per-brand Meta connect, page picker |
| Settings | Meta connect for active brand, location name |
| Mobile | Sidebar / bottom nav parity |

**Known user reports:**

- Demo prod shows **13 posts this week / 31 scheduled** — data exists when on correct workspace
- Local/dev sometimes showed **0** — timezone fix may be uncommitted
- TRC works in production on **email account**, not demo

### 3. Code audit pillars

Score each **P0 / P1 / P2 / P3** with file:line evidence.

#### Security & tenancy

- RLS / `withTenantDb` on all tenant routes
- IDOR on `locationId` params
- Meta token encryption (`TOKEN_ENC_KEY`)
- Auth rate limits, session handling
- Webhook auth (Stripe exempt)

#### Data integrity

- Home vs Calendar queued-post semantics (`dashboard-post-helpers.ts`)
- Active location consistency across pages
- Cron publish (`cron-publish.ts`) — transaction timeout fixes
- Ephemeral auth/uploads risk

#### UX / design system

- Warm-light compliance (no dark/gold leakage)
- Typography (sans only on pages; serif logo-only)
- Empty/error/loading states (`StateViews.tsx`)
- Accessibility: focus rings, aria on nav, reduced motion

#### Product completeness

- localStorage pages still stubbed
- TikTok → Instagram silent publish (AUDIT R3)
- Editor canvas jank (beta notes)
- Post preview in bulk schedule (requested, not built)
- Solo vs Command surface gating

#### Ops / deploy

- Prod env checklist vs `docs/env-audit.md`
- Sentry, smoke script coverage
- Orphan Vercel project `thepostpal-readable-v2`

### 4. Output format (required)

Deliver **`docs/AUDIT-2026-07-11.md`** (or dated equivalent) with:

```markdown
# Posterboy Social Audit — [date]

## Executive summary
[3–5 sentences: ship-ready? blockers?]

## Verified healthy
- [bullets with evidence]

## Findings

| ID | Sev | Area | Finding | Evidence (file:line) | Fix size (S/M/L) |
|----|-----|------|---------|----------------------|------------------|
| F1 | P0  | ...  | ...     | ...                  | S |

## Workspace / data notes
[demo vs TRC, prod vs local]

## Recommended next 5 (ordered)
1. ...

## Out of scope / won’t fix now
- ...

## Test plan for fix pass
- [ ]
```

### 5. Rules for the fix pass (later, not now)

- Minimize diff; match existing conventions
- No prod pushes without Brad
- No `git commit` unless Brad asks
- Run `npm run test` + build before claiming done
- Read Next 16 docs before routing/middleware changes

---

## Context from latest Cursor session (2026-07-10 – 07-11)

- Dashboard UI audit shipped (`4de34ef`)
- Bulk scheduler, holidays, Meta multi-brand pushed (`0304744`)
- User validates **TRC in prod works**; **demo** has real scheduled data on posterboy.social
- Home third column was empty → **Next Up** module added locally (weather fallback pattern)
- **Posts This Week** UTC bug fixed locally — may not be on prod yet

---

## One-liner for Brad when you’re done

> “Audit complete — [N] findings ([P0 count] blockers). Report at `docs/AUDIT-YYYY-MM-DD.md`. Ready to fix [top item] on your go.”
