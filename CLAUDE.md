# thepostpal (Posterboy Social)

@AGENTS.md

## Read first (agents)

**Canonical handoff (production live):** `docs/AGENT-HANDOFF-2026-06-03.md`  
**Next work:** `docs/PLAN-2026-06-04.md`  
**Prod env / DB:** `docs/PROD-ENV-CHECKLIST.md`, `docs/PROD-DB-SETUP.md`  
**Smoke test:** `./scripts/smoke-prod.sh`

## Project Overview

Social content platform for real estate and local businesses. Brand: **Posterboy Social** — https://www.posterboysocial.com

**Stack:** Next.js 16.2.6 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, GSAP 3.15, **Neon Postgres + Prisma + app-managed RLS**.

**Repo:** `~/Desktop/ventures/thepostpal/` is a SYMLINK to `~/Code/thepostpal-readable-v2/` — same checkout, either path works. ⚠️ Cursor and Claude often share this working tree: check `git branch --show-current` before committing, commit early (uncommitted WIP can be stashed/clobbered by the other tool), and never leave a migration-dependent commit unpushed without applying the prod migration first.

**Production:** Vercel project `angie-social-portal` (`bradly413s-projects`). `main` auto-deploys prod. Multi-tenant dashboard is **DB-backed** (not localStorage).

## Running Locally

```bash
cd ~/Desktop/ventures/thepostpal
export $(grep -h '^DATABASE_URL=' .env.local | sed 's/"//g')
npm run dev          # http://127.0.0.1:8240
```

Login: `/sign-in` — `demo` / `demo123` (DB-backed tenant provisioning)

**Build:** `prisma generate && next build` — always run `npx prisma generate` after `schema.prisma` changes.

## Architecture (tenancy + plans)

### Publish pipeline status convention (do not violate)

- `approved` = the INTERNAL cron publish queue (`/api/cron/publish`, every 5 min).
- `publishing` = cron's in-flight claim (server-only; stale claims sweep to `failed`).
- `scheduled` = legacy Meta-NATIVE scheduling only — the cron never dispatches it; do not write it for new posts.
- `failed` = surfaced on drafts/calendar with `errorLog` + Retry; `publishedPlatforms[]` records partial success so retries never double-post.
- Schema changes here need the prod migration applied (`scripts/deploy-prod-db.sh`) BEFORE the code reaches `main` — `main` auto-deploys.

### Auth + tenancy

- Session: httpOnly cookie, JWT (`jose`, `src/lib/auth.ts`).
- `requireAuthContext()` → `{ userId, tenantId, role, isSuperadmin }`.
- `withTenantDb(auth, fn)` sets `app.current_tenant_id` per transaction; **RLS** isolates tenants.
- New tenant routes: `requireAuthContext` → `withTenantDb` → `resolveAccess(userId, locationId, tx)` → 403.

### Solo vs Command

- `src/lib/plan-features.ts` — single source of truth.
- Commercial **Command** = Prisma `house_account` (no `command` enum).
- `GET /api/me` returns live `Organization.plan`.
- `PlanProvider` + `usePlan()` in `src/app/dashboard/layout.tsx`.
- Solo: streamlined UI (no multi-location switcher, no approval pipeline). Command: switcher, roll-ups, approvals.

### Client data layer (extend, don't fork)

- `src/lib/dashboard-api.ts` — typed API client
- `src/lib/dashboard-browser-state.ts` — active location id
- `src/components/dashboard/StateViews.tsx` — Skeleton / Empty / Error / NoLocation

## Key API routes (tenant-scoped unless noted)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/me` | Live plan + tenant context |
| `GET/POST /api/locations` | Locations |
| `GET/POST /api/posts`, `/api/posts/[id]` | Posts + approval actions |
| `GET/POST /api/photos`, `/api/photos/[id]` | Photo library |
| `GET/POST /api/calendar`, `/api/calendar/[id]` | Calendar events |
| `GET/PUT /api/brand-book` | Brand book (location `brandVoiceJson`) |
| `POST /api/webhooks/stripe` | Stripe (auth-exempt) |
| `POST /api/auth`, `/api/auth/signup` | Auth |
| `POST /api/ai` | Claude chat |
| `POST /api/generate-image` | Gemini image gen |
| `POST /api/meta/*` | Meta OAuth, publish, insights |
| `POST /api/upload` | Uploads (S3 when configured) |

## Dashboard pages

| Route | Backend |
|-------|---------|
| `/dashboard` | API (home) |
| `/dashboard/drafts`, `/dashboard/calendar`, `/dashboard/photos` | API |
| `/dashboard/brand` | Brand book API + cache |
| `/onboarding` | Brand Architect wizard |
| `/dashboard/studio` | Gemini + Leonardo |
| `/dashboard/analytics`, `/dashboard/editor`, `/dashboard/ads`, `/dashboard/organization`, `/dashboard/settings`, `/dashboard/templates`, `/dashboard/connect/meta` | API (per 2026-07-11 audit: the old localStorage routes `/dispatch`, `/reports`, `/facebook`, `/instagram` NO LONGER EXIST; `schedule-store.ts`/`events-store.ts` are type-only leftovers) |

## Agent / workflow gotchas

1. **`prisma generate` in build** — required on Vercel; stale client breaks deploys.
2. **Agents cannot `vercel env add` for production** — Brad sets prod env.
3. **`gh pr create` fails** — CLI authed as `brn4040-prog`; use browser PR or fix auth. `git push` works.
4. **PR merge commits** — after merge, sync `origin/main` into feature branches; don't force-push.
5. **Prod deploy** — high-severity; Brad authorizes production pushes.

## Environment (production)

See `docs/PROD-ENV-CHECKLIST.md`. As of 2026-07-13 prod has ALL core env set: `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `TOKEN_ENC_KEY`, KV/Redis, S3 + CloudFront (`S3_PUBLIC_BASE_URL`), Sentry DSNs, `NEXT_PUBLIC_APP_URL`, AI/Meta/Vimeo/Leonardo keys. Vercel marks most values Sensitive (cannot be pulled back); the prod Neon direct URL comes from `neonctl connection-string` (CLI authed on Brad's Mac).

## Design System — WARM-LIGHT (canonical)

> The dashboard is **warm-light**. Build around the home page (`.pb-home2`).
> The OLD dark/gold system (`#D4A853`, `bg-[#0c0c0e]`) is retired — do not use it.

### Foundation
- **Background**: cool-gray frosted — `linear-gradient(165deg,#eef0f2,#e9ebee,#edeff1)` + a faint red radial glow. Provided by the shared frame; pages are transparent.
- **Accent (brand red)**: `#ee2532` (`--pb-press`), deep `#c81e2a`. Positive metrics/success use green `#1f9d4d`.
- **Cards**: frosted glass — `background: rgba(255,255,255,0.72)`, `backdrop-filter: blur(22px) saturate(1.5)`, 20–24px radius, soft shadow.
- **Type**: sans (SF Pro / Inter). **Serif (`var(--font-instrument-serif)`) is logo-ONLY** — never on page/section titles.
- **No emojis in UI.**

### Shared building blocks (`src/app/globals.css`)
- One sidebar everywhere: `AppSidebar` (`.pb-side`) — frosted, serif `posterboy` logo, uppercase nav, red active. Rendered by `DashboardShell` (the shared frame).
- Content pages wrap in `.pb-app` and use the kit: `.pb-panel`, `.pb-panel-h`, `.pb-field`, `.pb-label`, `.pb-tab`, `.pb-toggle`, `.pb-row`, `.pb-tile`, `.pb-chip-soft`, `.pb-btn-primary`/`.pb-btn-secondary`, `.pb-press-text`.
- Shared states: `StateViews.tsx` (Skeleton/Empty/Error/NoLocation).
- A global `:focus-visible` red ring is applied across `.pb-home2/.pb-app/.pb-studio`; GSAP entrances respect `prefers-reduced-motion`.

## Posterboy Studio (`/dashboard/studio`)

AI image generation with particle reveal animation. Flow: prompt → `/api/generate-image` (Gemini) → `ParticleReveal` → optional Leonardo upscale/remove-bg.

## Deployment

- **Live:** https://www.posterboysocial.com
- **Watch:** `npx vercel ls angie-social-portal --scope bradly413s-projects`
- **Verify:** `./scripts/smoke-prod.sh`

## Prisma + database

**Active in production.** Schema: `prisma/schema.prisma`. Migrations + RLS policies applied via `scripts/deploy-prod-db.sh` for prod.

## Related docs

| Doc | Purpose |
|-----|---------|
| `docs/AGENT-HANDOFF-2026-06-03.md` | EOD production handoff |
| `docs/PLAN-2026-06-04.md` | P0–P3 next steps |
| `docs/BUSINESS-PLAN-ALIGNMENT-2026-06.md` | Solo/Command commercial alignment |
| `docs/AGENT-FLEET-PLAN.md` | Ops agent fleet (monitor, maintain, etc.) |
| `docs/CLAUDE-UPDATE-2026-06-02.md` | Marketing mobile pass |

## Brand reference (demo / Angie)

- `src/lib/brand-books/angie-nichols.ts` — seed/demo brand book
- `/api/ai` may still use hardcoded context; prefer per-tenant brand book over time
