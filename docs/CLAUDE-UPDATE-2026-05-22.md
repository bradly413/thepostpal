# Claude update — posterboy / thepostpal-readable-v2

**Date:** 2026-05-22  
**Repo:** `~/Code/thepostpal-readable-v2/`  
**Branch:** `main` (large uncommitted working tree — see git status before assuming HEAD)  
**Last known commit:** `ba1e928` — *fix: use vercel-safe tmp fallback for auth store*

Paste the **Context prompt** section into a new Claude thread to continue work.

---

## Context prompt (paste below)

You are helping Brad Nichols on **Posterboy Social** (`posterboysocial.com`), a social content platform for real estate and local businesses. The public marketing site and dashboard are in active beta prep (May 2026).

**Read first:** `AGENTS.md`, `CLAUDE.md`, this file, `docs/vercel-production.md`, `docs/CLAUDE-SESSION-HANDOFF.md`.

### Stack
- Next.js **16.2.6** (App Router, Turbopack), React 19, TypeScript, Tailwind v4
- GSAP 3.15 + ScrollTrigger + `@gsap/react`; marketing uses **Lenis** smooth scroll with `scrollerProxy`
- Auth: JWT (`jose`), signup via `auth-store` (Upstash or `/tmp`)
- **Prisma exists** (`prisma/schema.prisma`, `/api/posts`, `/api/locations`) but **dashboard UI still uses localStorage** — do not assume DB-backed workflow in the app yet

### Dev (correct repo / port)
```bash
cd ~/Code/thepostpal-readable-v2
npm run dev   # http://127.0.0.1:8240  (NOT 8238 — different project on 8238)
```
- Login: `/sign-in` — `demo` / `demo123`
- Signup CTA: `/sign-in?mode=signup&next=%2Fonboarding`

### Production deploy
```bash
npx vercel link --yes --project angie-social-portal --scope bradly413s-projects
npx vercel deploy --prod -y
```
- **Live:** https://www.posterboysocial.com (also aliased https://thepostpal.com)
- **Project:** `angie-social-portal` — see `docs/vercel-production.md`
- CLI deploys **local files** (committed or not); Git integration is separate

---

## What changed (May 21–22 sessions)

### Marketing homepage (`src/app/(marketing)/page.tsx` → `MarketingSite.tsx`)

| Section | File | Notes |
|---------|------|--------|
| Nav | `Navigation.tsx` | Lenis `scrollToAnchor` (not `scrollIntoView`) |
| Hero | `sections/Hero.tsx` | Char reveal + app icon |
| **Product / iPad zoom** | `sections/DashboardZoomSection.tsx` | `id="product"`; sticky + scrub (no GSAP pin); `posterboy-dashboard-zoom.png` + `@2x`; headline ~2 lines (`max-width: min(42ch, 94vw)`) |
| **Scheduling calendar** | `sections/SchedulingCalendar.tsx` | ASCII→image reveal; 7-col grid; `scheduling-calendar-data.ts` |
| Built for | `BuiltForStrip.tsx` | Links to `/for/[slug]` |
| Carousel | `CarouselSection.tsx` | **Sticky + scrub** (pin removed for Lenis) |
| Manifesto | `ScrollWordReveal.tsx` | |
| Solution | `Solution.tsx` | Horizontal flow — **sticky + scrub** (pin removed) |
| Features / Founder / Pricing / Footer | respective `sections/*` | |
| Chat | `ChatbotWidget.tsx` | **Demo assistant** — mock only; copy from `lib/pricing.ts` |

**Scroll:** `MarketingScrollProvider.tsx` + `lib/marketing-scroll-engine.ts` (`connectLenisScrollTrigger`).  
**Styles:** `src/styles/posterboy-marketing.css`  
**Removed from homepage:** ScatteredCards / AsciiReveal gallery

**Pricing unified:** Homepage `Pricing.tsx` uses `getPublicTiers()` from `lib/pricing.ts` (same as `/pricing`).  
**Legal:** `/privacy`, `/terms` — subpages use `MarketingSubpageChrome.tsx`.

### Auth & onboarding
- `?plan=good|better|best` saved via `lib/plan-storage.ts` on sign-in
- Login redirects to `/onboarding` if no brand book / org (`lib/onboarding-brand-sync.ts`)
- Onboarding approve: syncs `postpal-brand-book` → `organization-store` via `syncBrandBookToOrganization()`
- `ensureDashboardData()` (`lib/dashboard-data-init.ts`): seeds demo bakery **only** if no org and no brand book

### Dashboard (beta UX fixes)
- **Scroll fix:** `dashboard/layout.tsx` + `DashboardShell.tsx` — `.ds-scroll-pane` with `overflow-y-auto` (was clipping bottom on every page)
- **Beta banner** in shell; nav labels: Week, Issues, Copy editor
- **Honest metrics:** home status labels (not “Live”); analytics = workflow counts; settings reports placeholders
- **Meta publish:** `lib/meta-publish-payload.ts` + `lib/upload-public-image.ts` — uses OAuth from `meta-store`, active `locationId`, uploads data URIs before publish; API accepts `pageToken` from client

### Middleware (`src/middleware.ts`)
- Public: `/`, `/sign-in`, `/privacy`, `/terms`, `/pricing`, `/for/`, `/tools/`, `/images/`, `/api/auth`
- `/onboarding` is **protected** (signup with `next=/onboarding` works)

---

## Architecture truth (avoid wrong assumptions)

```text
Marketing signup → JWT → /onboarding → postpal-brand-book (localStorage)
                              ↓
                    syncBrandBookToOrganization() on approve
                              ↓
                    posterboy-organization + locations (localStorage)
                              ↓
                    drafts-store, issues-store, dispatch, home (localStorage)

Parallel (unused by dashboard UI today):
  Prisma POST /api/posts, /api/locations/*, approval routes
```

- **Press / Approve** in drafts = local status only, not Meta publish
- **Demo login** (`legacy: true`) has no `accountId` — Prisma APIs 401 if wired without migration
- **Settings Meta OAuth** must be connected for Studio/template publish to work

---

## GSAP + Lenis patterns (marketing)

- **Do not** use `pin: true` on Lenis pages without testing — caused `pin-spacer` glitches on dashboard zoom
- **Prefer:** sticky section + tall scroll height + `ScrollTrigger` scrub `onUpdate` (see `DashboardZoomSection.tsx`, `CarouselSection.tsx`, `Solution.tsx`)
- **Nav scroll:** `useMarketingScroll().scrollToAnchor('#section')`
- **Refresh:** `scheduleMarketingScrollRefresh()` after images/layout changes
- `MarketingSiteHealthProbe` — **dev only** (`NODE_ENV === 'development'`)

---

## Beta weekend — still open (prioritized)

### Must disclose or fix for testers
1. Data is **per-browser localStorage** (clear storage = lose work)
2. Auth store needs **Upstash + AUTH_SECRET** on Vercel for real signups
3. Prisma post/approval APIs exist but **no dashboard UI** calls them
4. Studio tool rail / schedule picker — mostly UI shell

### Nice to have
- Wire dashboard to Prisma or hide server APIs from docs
- Real Meta insights on analytics (pages exist: `/dashboard/facebook`, `/dashboard/instagram`)
- Commit working tree; align `CLAUDE.md` (still says `/` is login in places)

---

## Key files (quick index)

| Area | Paths |
|------|--------|
| Marketing shell | `src/components/marketing/MarketingSite.tsx` |
| Scroll / Lenis | `MarketingScrollProvider.tsx`, `lib/marketing-scroll-engine.ts`, `lib/marketing-scroll-anchor.ts` |
| Pricing | `lib/pricing.ts`, `src/components/PricingCards.tsx` |
| Onboarding sync | `lib/onboarding-brand-sync.ts`, `src/app/onboarding/page.tsx` |
| Dashboard shell | `src/components/DashboardShell.tsx`, `src/app/dashboard/layout.tsx` |
| Home UI | `src/components/dashboard/home/DashboardHome.tsx` |
| Meta publish | `lib/meta-publish-payload.ts`, `src/app/api/meta/publish/route.ts` |
| Deploy | `docs/vercel-production.md` |

---

## Regenerate live snapshot (optional)

```bash
./scripts/generate-claude-catchup.sh
# writes docs/CLAUDE-SESSION-HANDOFF-LIVE.md with ports, routes, git status
```

---

## Suggested next tasks for Claude

1. Commit + push beta changes; confirm Vercel Git deploy matches CLI deploy
2. Smoke test: marketing scroll (carousel, solution, product zoom), signup → onboarding → dashboard brand name (not bakery)
3. Production env audit on `angie-social-portal`
4. Optional: first Prisma wire-up (drafts list reads `/api/posts`) or explicit “demo mode” empty states
