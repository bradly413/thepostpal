# posterboy — Master Brief (Claude Code / Codex)

**Last updated:** May 2026  
**Canonical repo for this brief:** `~/Code/thepostpal-readable-v2/`  
**Read first:** this file → `AGENTS.md` → `CLAUDE.md` (file-level detail; partially stale — see § conflicts)

Paste this entire file into Claude Code at the start of a session, or tell Claude Code: *“Read `docs/POSTERBOY-MASTER-BRIEF.md` and confirm scope before coding.”*

---

## 1. Executive summary

**posterboy** (customer-facing; legal/product: **Posterboy Social**) is a calm, approval-first social media platform for local businesses and realtors who would rather not run social themselves.

- **Domain:** [posterboysocial.com](https://posterboysocial.com)
- **Owner/builder:** Brad Nichols (Bradly Robert Creative LLC)
- **First customer context:** Angie Nichols, Realtor — West County St. Louis (Coldwell Banker)
- **Core promise:** *“The week is drafted. Approve it and go back to work.”*
- **Moat vs Buffer/Hootsuite:** Not creator analytics or comment inbox — **Draft → Press → Dispatch** with optional **Issues** (weekly bundle) and **multi-location corporate approval** (House Account tier)

**Near-term business goal:** People can visit posterboysocial.com, **sign up, pay for a subscription**, and onboard (including **waiting clients now**).

---

## 2. Brand & voice

| Rule | Detail |
|------|--------|
| Product name | lowercase **posterboy** in UI |
| Legal / filing | **Posterboy Social** (trademark target) |
| Taglines | “Post less. Sell more.” / “Social media for people who’d rather not.” |
| Voice | Witty, never zany. Short sentences. Human, not “creator.” OK to sound a little tired. |
| UI | **No emojis** in product UI (owner preference) |
| Never say | crush it, go viral, hustle, streak, level up, content creator, influencer, growth hack |
| Always say | Drafts, The Editor, Dispatch, Issues, **Press** (not “Publish” or “Approve & post”) |

**Canonical copy:** `src/lib/posterboy-copy.ts`  
**Brand tokens:** `docs/brand-implementation-notes.md` — Ink `#111111`, Paper `#FAF7F1`, Bone `#F4EFE5`, Press Red `#D9352B` (sparingly)

**Hero icon (marketing):** `public/images/posterboy-app-icon.png` — red squircle + white paper plane.  
**Do NOT use:** `posterboy-icon.png` (full brand sheet), `posterboy-app-icon.svg` (approximation)

---

## 3. Two repositories — read before any billing/auth work

There are **two codebases**. They are **not** feature-parity.

| | **`thepostpal-readable-v2`** | **`Desktop/ventures/thepostpal`** |
|---|------------------------------|-----------------------------------|
| **Path** | `~/Code/thepostpal-readable-v2/` | `~/Desktop/ventures/thepostpal/` |
| **Primary work** | Marketing homepage (GSAP), Angie templates, Studio/Leonardo, signup API | **Stripe billing**, Prisma auth, webhooks, feature gating, multi-location planning |
| **Stripe in code** | **No** | **Yes** — `src/lib/stripe.ts`, `api/webhooks/stripe`, `server-billing-store.ts` |
| **Auth** | `auth-store.ts` (Upstash Redis or file fallback) + JWT | DB-first Prisma + migrations |
| **Marketing `/`** | `MarketingSite` (Kimi/GSAP design) | Different / older |
| **Docs** | `docs/` in v2 | Codex docs: `stripe-billing-setup.md`, `claude-sync-v2.md`, `master-brief-alignment.md`, etc. |

**Decision Brad must confirm per task:** ship from **thepostpal**, **port billing into v2**, or **merge repos**.  
Until merged, **do not assume** Stripe docs in `thepostpal/docs/` apply to v2 code.

---

## 4. Pricing — three naming systems (must align)

| Source | Tiers | Prices |
|--------|-------|--------|
| **Growth plan / `/pricing`** (`src/lib/pricing.ts`) | Solo, Shop, Press | $24, $48, $120/mo |
| **Homepage** (`sections/Pricing.tsx`) | Good, Better, Best | $29, $59, $99/mo |
| **Codex / thepostpal** (`stripe-billing-setup.md`) | TRIAL, STARTER, PRO, TEAM | Stripe price IDs |

**Premium (all docs):** Studio (~$399), House Account (~$1,500), BRC Custom (quoted) — `mailto:` CTAs.

**Recommended canonical public tiers:** **Solo / Shop / Press** — matches `prisma/schema.prisma` `PlanTier` and growth plan.  
**Action needed:** Unify homepage + Stripe products + marketing copy to one tier set.

---

## 5. Product scope — objects & flows

### Domain objects

| Object | UI name | Purpose |
|--------|---------|---------|
| Draft | **Drafts** | Post awaiting review (`needs_review`) |
| Approval action | **Press** | Approve a draft |
| Schedule slot | **Dispatch** | Calendar / scheduled publish |
| Weekly bundle | **Issues** | Batch review |
| Workspace | **Organization** | Multi-location parent |
| Site | **Location** | Per-site brand, drafts, channels |
| Voice setup | **Brand intake** | Tone, banned phrases, audience |

**Schema:** `prisma/schema.prisma` (includes `Subscription.stripeCustomerId`) — **not active in v2 runtime**.  
**Runtime today (v2):** `src/lib/*-store.ts` — **localStorage** for drafts, schedule, photos, org, etc.

### Core user journey (target)

```
Sign up → (pay) → Onboarding / brand intake → Drafts appear → Press → Dispatch → Published
```

**Activation metric:** Customer **Presses ≥3 posts in first 7 days**.

### Multi-location (launch-blocking for House Account tier)

Per Codex `master-brief-alignment.md` + `launch-critical-workstreams.md`:

- Location switcher in app shell
- Location-scoped content, calendar, assets
- **Corporate approval** before publish (local create → corp approve)
- Stripe quantity billing for extra locations
- v1: location switching + approvals + roll-up visibility — **not** compose-once fan-out to all locations (that’s v2)

---

## 6. Technical stack (v2 — canonical repo)

| Layer | Technology |
|-------|------------|
| Framework | Next.js **16.2.6** App Router, Turbopack — **read `node_modules/next/dist/docs/` before API assumptions** |
| UI | React 19, TypeScript, Tailwind CSS **v4** |
| Motion | GSAP 3.15 + ScrollTrigger + `@gsap/react` (marketing) |
| Auth | JWT (`jose`), cookie `session`, `src/lib/auth.ts` + `src/lib/auth-store.ts` |
| Rate limit | Upstash Redis (`src/lib/rate-limit.ts`) |
| DB | Prisma schema exists; **dashboard not on Postgres yet** |
| Deploy | Vercel — **production domain** `posterboysocial.com` → **`angie-social-portal`** (`prj_EtYVaDgXLp5EADQq8CuDAkExkWQZ`); `thepostpal-readable-v2` is a sibling deploy (same repo), not live unless domains move |

### Dev

```bash
cd ~/Code/thepostpal-readable-v2
npm run dev
```

- **Sign up / sign in:** `/sign-in`
- **Legacy demo login:** env `PORTAL_USERNAME` / `PORTAL_PASSWORD` (e.g. demo/demo123) — still works via `auth.ts`
- **Build before deploy:** `npm run build`

### Environment variables (v2)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | JWT signing (required) |
| `PORTAL_USERNAME` / `PORTAL_PASSWORD` | Legacy admin login |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Rate limit + **auth persistence on Vercel** |
| `ANTHROPIC_API_KEY` | AI assistant |
| `GEMINI_API_KEY` | Studio image gen |
| `LEONARDO_API_KEY` | Studio upscale/remove-bg |
| `NEXT_PUBLIC_META_APP_ID` / `META_APP_SECRET` | Meta OAuth/publish |
| `VIMEO_ACCESS_TOKEN` | Video library |
| `DATABASE_URL` | Prisma (when activated) |
| `STRIPE_*` | **Not wired in v2** — see thepostpal + `stripe-billing-setup.md` |

---

## 7. Routes map (v2 — current truth)

### Public marketing (`src/app/(marketing)/`)

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | `MarketingSite` | GSAP long-scroll homepage — **not** login |
| `/pricing` | Editorial pricing | Solo/Shop/Press + premium |
| `/for/[slug]` | Vertical landing | realtors, restaurants, salons, etc. |
| `/tools/what-to-post` | Lead tool | |

**Marketing sections (order):** Nav → Hero → Carousel (#problem) → Manifesto → Solution → WordScroll → HolographicFeature → Founder → Pricing → Footer → ChatbotWidget

**Key files:** `src/components/marketing/`, `src/styles/posterboy-marketing.css`, `src/lib/marketing-scroll-engine.ts`

### Auth & onboarding

| Route | Notes |
|-------|-------|
| `/sign-in` | Login + signup forms → `POST /api/auth`, `POST /api/auth/signup` |
| `/onboarding` | Brand wizard — **localStorage**, not Prisma |

### Dashboard (`src/app/dashboard/`)

| Route | Role |
|-------|------|
| `/dashboard` | Redirects → `/dashboard/drafts` |
| `/dashboard/drafts` | **Primary home** — Press workflow |
| `/dashboard/dispatch` | Scheduling |
| `/dashboard/issues` | Weekly bundles |
| `/dashboard/editor` | Template picker |
| `/dashboard/editor/[templateId]` | Live editor |
| `/dashboard/organization` | Multi-location (early) |
| `/dashboard/analytics` | “You showed up” summary |
| `/dashboard/brand-intake` | Voice setup |
| `/dashboard/settings` | Meta, prefs |
| `/dashboard/studio` | **Posterboy Studio** — Gemini + ParticleReveal + Leonardo |

**Legacy / secondary routes (many still exist, not in main nav):** templates, calendar, photos, videos, ai-assistant, facebook, instagram, reports, creator-studio, create-image, feedback, brand, knowledge, etc.

**Shell:** `src/components/DashboardShell.tsx` — nav emphasizes Drafts, Dispatch, Issues, Editor, Organization, Analytics, Studio, Settings.

### API routes (high value)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth`, `/api/auth/signup` | Login, register |
| `POST /api/generate-image` | Gemini Studio |
| `POST /api/leonardo/*` | Upscale, remove-bg |
| `POST /api/ai` | Claude chat |
| `POST /api/meta/*` | OAuth, publish, insights |
| `POST /api/upload` | File upload |
| `GET /api/vimeo/videos` | Vimeo |

Full list: `CLAUDE.md`, `docs/api-integrations.md`

---

## 8. Middleware & public paths

`src/middleware.ts` — JWT cookie required for all non-public routes.

**Public:** `/`, `/sign-in`, `/onboarding`, `/pricing`, `/for/*`, `/tools/*`, `/images/*`, `/api/auth/*`

**Critical:** `/images/*` must stay public or marketing assets 307 to `/sign-in`.

---

## 9. Feature areas — status

| Area | Status in v2 | Notes |
|------|--------------|-------|
| Marketing homepage | **Built** — needs polish, real photos, pricing alignment | Debug probes in `marketing-debug.ts` — remove before prod |
| Signup / login | **Works** | Needs Upstash on Vercel for durable accounts |
| **Stripe billing** | **Missing** | Implement or port from thepostpal |
| Drafts / Press | **Works** | `drafts-store.ts` localStorage |
| Dispatch / calendar | **Partial** | localStorage |
| Meta publish | **API exists** | Production needs public image URLs (not data URLs) |
| Prisma / Postgres | **Schema only** | |
| Studio / Leonardo | **Built** | Flagship demo feature |
| Templates | **23 templates** | `templates.ts`, editor |
| Multi-location | **Early UI** | Launch-blocking for House Account per product brief |
| Scheduled publishing (server) | **Codex repo** | See `thepostpal/docs/scheduled-publishing.md` |
| Sentry / monitoring | **Not wired** | See launch-critical workstreams |

---

## 10. Dashboard UI direction (planned — not fully built)

**North star:** Editorial approval desk, not bento creator suite.

**Target primary nav (5–7 items):** This week → Drafts → Dispatch → Issues → Editor → Brand → Settings  
**Demote:** duplicate calendar, scattered create tools, raw analytics nav

**Design:** `.pb-app` editorial palette on dashboard; marketing uses paper/ink/serif.

See prior planning notes in conversation / Buffer comparison: `docs/BUFFER-MARKETING-COMPARISON.md`

---

## 11. Revenue & onboarding — near-term playbook

### Track A — Waiting clients (this week, no full Stripe port)

1. Stripe Dashboard: products + **Payment Links** for Solo/Shop
2. Client: **Sign up** at `/sign-in` → pay via link → onboarding call
3. You: brand intake → seed drafts (concierge; localStorage OK for pilots)
4. Production: `AUTH_SECRET`, `UPSTASH_REDIS_*` on Vercel, domain → correct project

### Track B — Self-serve (2–3 weeks)

1. Port or rebuild: Checkout, webhook, Customer Portal, plan gating
2. Signup reads `?plan=solo|shop|press` → checkout after account
3. Gate `/dashboard/*` on active subscription
4. Settings → Billing tab

**Codex reference implementation:** `~/Desktop/ventures/thepostpal/` + `docs/stripe-billing-setup.md`

---

## 12. Deployment

- **Vercel (live):** `angie-social-portal` — `posterboysocial.com` / `www.posterboysocial.com` (project id `prj_EtYVaDgXLp5EADQq8CuDAkExkWQZ`)
- **Vercel (sibling):** `thepostpal-readable-v2` — same GitHub repo (`bradly413/thepostpal`); use for previews/experiments unless you migrate the domain
- **Env on Vercel:** Set secrets on **`angie-social-portal`** for production (e.g. `ANTHROPIC_API_KEY`, `AUTH_SECRET`, Upstash); add Stripe when billing lands
- **Git:** Large marketing/auth changes may be **uncommitted** — deploy via CLI uploads local files; git push for CI consistency

---

## 13. Documentation index

- **`docs/vercel-production.md`** — which Vercel project serves `posterboysocial.com` vs staging

| File | Use |
|------|-----|
| **`docs/POSTERBOY-MASTER-BRIEF.md`** | **This file — full scope** |
| `CLAUDE.md` | Deep file map (verify dates) |
| `docs/posterboy-growth-plan.md` | Business model, tiers, activation |
| `docs/launch-critical-workstreams.md` | Auth, multi-location, Sentry, trademark |
| `docs/brand-implementation-notes.md` | Colors, type, voice |
| `docs/api-integrations.md` | Gemini, Leonardo, Meta, Claude |
| `docs/studio-particle-animation.md` | Studio UX |
| `docs/BUFFER-MARKETING-COMPARISON.md` | Marketing IA vs Buffer |
| `docs/POSTERBOY-KNOWLEDGE-PROMPT.md` | Repo audit prompt (Cursor/Codex) |
| `docs/POSTERBOY-BROWSER-KNOWLEDGE-PROMPT.md` | Browser Claude/ChatGPT (paste files) |
| `~/Desktop/ventures/thepostpal/docs/*` | Codex engineering (Stripe, auth migration, platform) |

**External references:** `~/Downloads/posterboy-cursor-dump.md` (original Kimi marketing design)

---

## 14. Known conflicts (do not ignore)

| Topic | Stale / wrong | Current truth |
|-------|---------------|---------------|
| Homepage `/` | `CLAUDE.md` says login | **Marketing site** — login is `/sign-in` |
| Pricing names | Good/Better/Best on homepage | Align to **Solo/Shop/Press** |
| Stripe | Docs in thepostpal | **Not in v2 code** |
| Prisma | Schema exists | **localStorage** drives dashboard |
| Billing tiers | STARTER/PRO/TEAM (Codex) | Map to Solo/Shop/Press when porting |
| `PosterboyExperience` | WebGL homepage | **Unused** — replaced by `MarketingSite` |
| Meta publish | Works in dev | Needs **public CDN URLs** for prod |
| Debug code | `marketing-debug.ts`, health probe | Remove before production marketing ship |

---

## 15. Priority order (May 2026)

Brad’s stated priorities:

1. **Revenue** — paid signups + onboard waiting clients on posterboysocial.com
2. **Infra** — domain, Vercel env, durable auth (Upstash)
3. **Billing** — port Stripe from thepostpal OR deploy thepostpal
4. **Pricing/marketing alignment** — one tier story, CTAs → `/sign-in?plan=`
5. **Dashboard IA** — approval-first shell (parallel, not blocking pilots)
6. **Multi-location + corporate approval** — launch-blocking for House Account tier
7. **Marketing polish** — hero/carousel, real photos, remove debug instrumentation

---

## 16. How to work with Brad

- **Minimize scope** — smallest correct diff; match existing patterns
- **Do not commit** unless explicitly asked
- **Next.js 16** — check framework docs; training data may be wrong
- **No emojis** in UI
- **Two repos** — confirm which before billing/auth migrations
- After marketing changes: `npm run build`
- Prefer `posterboy-copy.ts` over improvising marketing voice

**Start every session by asking:**

1. Which repo is canonical for this task — **v2** or **thepostpal**?
2. Which track — **revenue**, **marketing**, **dashboard**, or **multi-location**?
3. Which tier names are we shipping on Stripe?

---

## 17. One-paragraph elevator pitch (for agents)

posterboy is Posterboy Social — social media for people who’d rather not. We draft a client’s week of posts; they **Press** to approve; **Dispatch** handles scheduling. We’re not Buffer: no hustle, no creator gamification, calm editorial UX. Built in Next.js 16 with a GSAP marketing site on `/`, signup at `/sign-in`, and a dashboard centered on Drafts. Prisma and Stripe exist in planning and in a sibling Codex repo; v2 needs billing ported and pricing aligned before posterboysocial.com takes paid subscriptions. First users are local businesses and realtors; multi-location corporate approval is the enterprise wedge.
