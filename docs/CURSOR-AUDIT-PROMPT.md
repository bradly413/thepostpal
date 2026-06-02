# Cursor: Catch Up, Then Run a Full Audit

You are auditing **The Restaurant Creatives** — a Next.js app that hosts a public
marketing site, a private studio dashboard, and cinematic client pitch decks.
This document has two parts:

1. **Part A — Catch up.** Rebuild an accurate mental model of the current state.
   Verify each claim against the actual code before trusting it.
2. **Part B — The audit.** Run a complete, thorough audit across four surfaces
   and report findings. **Do not change any code in this pass** — produce a
   findings report only. Fixes happen in a later, approved pass.

---

## Part A — Catch up on the project

### Stack
- **Next.js 15** (App Router, JS not TS), **React 19**
- **Supabase** — auth (email/password) + Postgres, Row-Level Security
- **Resend** — transactional email, from `info@therestaurantcreatives.com`
- **Upstash Redis + Ratelimit** — rate limiting (⚠️ env vars NOT set in prod, so
  the limiter currently no-ops — confirm and flag)
- **GSAP + ScrollTrigger + Lenis** — animation/smooth-scroll (deck + marketing)
- **Vercel** — hosting, domain `therestaurantcreatives.com`

### Routes (verify in `src/app/`)
| Route | File | Purpose |
|---|---|---|
| `/` | `src/app/page.js` | Marketing home (hero, work, studio, contact, footer) |
| `/work` | `src/app/work/page.js` | Work page |
| `/studio` | `src/app/studio/page.js` | Studio page |
| `/contact` | `src/app/contact/page.js` | Contact page |
| `/signin` | `src/app/signin/page.js` | Studio login (Supabase auth) |
| `/admin` | `src/app/admin/page.js` | **Primary** studio dashboard — renders `<Dashboard/>` + mounts the real SendPanel / CreatePanel / EditPanel (imported from `AdminWorkbench.jsx`) |
| `/admin/manage` | `src/app/admin/manage/page.js` | Legacy full workbench (`<AdminWorkbench/>`) kept as a fallback — candidate for removal |
| `/admin/preview` | `src/app/admin/preview/page.js` | Redirects to `/admin` (legacy) |
| `/pitch/[slug]` | `src/app/pitch/[slug]/page.js` | Validates slug, redirects to the static deck at `/<slug>/`. Does NOT record a view (the deck owns tracking) |
| `/api/track/[slug]` | `src/app/api/track/[slug]/route.js` | Records deck view `start` + `end`/duration. Uses the **service-role** key (RLS has no UPDATE policy); origin-allowlisted + payload-validated |
| `/api/send-presentation` | `src/app/api/send-presentation/route.js` | Sends the pitch email via Resend; Supabase-auth-gated; Upstash rate-limited |
| `/bartolinos/` | `public/bartolinos/index.html` | The cinematic pitch **deck** — a single ~6,300-line static HTML file (GSAP/ScrollTrigger/Lenis), `<base href="/bartolinos/">`, inline view-tracking script |

Middleware: `src/middleware.js` protects `/admin/*` and `/signin` (redirects
unauthenticated `/admin/*` → `/signin`, and authenticated `/signin` → `/admin`).
`auth.getUser()` is wrapped in try/catch.

### Key components / lib
- `src/components/Dashboard.js` — the studio dashboard UI (single-screen 3×3 grid,
  live Supabase analytics, accepts optional `onSendDeck/onEditDeck/onNewClient/
  onNewDeck` callbacks + `refreshSignal`; falls back to navigating to
  `/admin/manage` when used standalone).
- `src/components/AdminWorkbench.jsx` — the original workbench; exports
  `SendPanel`, `CreatePanel`, `EditPanel` (named) + default `AdminWorkbench`.
- `src/lib/dashboard-data.js` — loads/derives dashboard analytics from Supabase.
- `src/lib/supabase.js` (browser client) / `src/lib/supabase-server.js` (server).
- `src/lib/schema.sql` — schema reference.

### Data model (Supabase)
- `clients` (id, name, contact, email, cover_image, created_at)
- `presentations` (id, title, slug, status['draft'|'sent'|'live'|'archived'],
  created_at, sent_at, client_id)
- `presentation_views` (id, presentation_id, session_id, ip_hash, started_at,
  ended_at, duration_seconds) — RLS: anon INSERT only, authenticated SELECT only,
  **no UPDATE policy** (that's why the track route uses the service-role key)
- `pipeline_deals` (id, name, pitch, stage, deal_date, created_at)
- `admin_notes` (id, text, user_id, created_at)

### Deploy specifics (important)
- Production deploys via `vercel --prod`. **Quirk:** PR merges authored as
  `brn4040@gmail.com` stall in Vercel's queue (commit-author email not recognized
  by the connected git integration); deploying from CLI with the
  `bradly@bradlyrobert.com` author works. Don't rely on auto-deploy-on-merge.
- Security headers + CSP are set in `next.config.mjs` (split: `DECK_CSP` for
  `/bartolinos` + `/pitch`, `APP_CSP` for everything else; `unsafe-inline` allowed
  for styles/scripts, `unsafe-eval` dropped; `connect-src` allowlist).

### Recent state / decisions (so you don't "re-fix" intentional choices)
- The dashboard accent is **gold `#c8a565`** (ties to the Bartolino's sign). An
  earlier blue (`#0097B2`) accent on the bento was intentionally retoned to gold.
  **Do not reintroduce blue.**
- The deck owns view tracking end-to-end; the `/pitch` redirect deliberately does
  NOT insert a view (that previously double-counted). Don't "restore" it.
- Deck has a bento "What this could look like" section, a private client header,
  opening CTAs, outcome-based service cards, an accelerator-framed AI section, a
  "what happens next" list, and a sidebar progress indicator.
- No founder personal name should be ADDED anywhere new (keep existing references
  only). No "social media management" positioning — it's a creative studio.

### Hard rules for this audit
- **Read before judging.** Verify each Part A claim and each finding against the
  real code; this doc may be stale.
- **Do not break the deck.** `public/bartolinos/index.html` is a hand-tuned
  cinematic file with pinned GSAP ScrollTriggers; flag issues, don't refactor.
- **Report only in this pass — no code changes.** Fixes are a separate approved pass.
- Treat the deck as **client-facing and confidential** ("Prepared exclusively for
  Bartolino's") — legal/privacy findings matter.

---

## Part B — The audit

Audit these four surfaces **in this order**. For each surface, evaluate **every
dimension** in the matrix below.

### Surfaces (in order)
1. **Marketing site** — `/`, `/work`, `/studio`, `/contact` (+ shared `Menu`,
   `Footer`, `Chrome`, `DynamicBackground`, animations).
2. **Studio login** — `/signin` + `src/middleware.js` (auth gating, redirects,
   error/lockout behavior, session handling).
3. **Dashboard** — `/admin` (+ `Dashboard.js`, `AdminWorkbench.jsx` panels,
   `dashboard-data.js`), `/admin/manage`, `/admin/preview`. Cover the wired
   actions: search, New Client, New Deck, Send (Resend flow), Edit, copy link,
   mark-sent, notes, pipeline.
4. **Presentation (deck)** — `/pitch/[slug]` → `/bartolinos/`
   (`public/bartolinos/index.html`) + `/api/track/[slug]` + `/api/send-presentation`.

### Dimensions (apply to each surface)
- **Bugs** — runtime errors, race conditions, unhandled promise rejections,
  null/undefined access, state desync, hydration mismatches, broken data shapes.
- **Dead ends** — buttons/links/handlers that do nothing, no-op flows, panels that
  can't close, states with no exit, empty states with no CTA.
- **Broken links** — internal anchors/routes, external links (booking, email,
  socials), deck asset paths (videos/images under `/bartolinos/assets/...`),
  trailing-slash/base-href issues, 404s.
- **Design suggestions** — hierarchy, spacing, typography, contrast, consistency
  with the black/cream/gold editorial system, polish opportunities.
- **UI/UX functionality** — does each interaction do what it implies? loading,
  empty, error, success states; focus management; keyboard nav; toasts; copy clarity.
- **Responsive** — verify **desktop, tablet, AND mobile** for every surface.
  The dashboard is single-screen-no-scroll on desktop and falls back to scroll on
  tablet/mobile; the deck has its own breakpoints. Flag overflow, clipping,
  unreadable text, broken layouts, touch-target sizes, the mobile nav drawer.
- **Security** — auth gating + RLS correctness, the service-role usage in
  `/api/track` (is the origin allowlist + validation sufficient?), the
  `/api/send-presentation` auth + rate limit (Upstash is unset in prod — flag),
  secrets exposure, CSP gaps, SSRF/injection, view-tracking abuse, PII handling,
  `ip_hash` approach.
- **Engineering / code review** — correctness, dead code, duplication (e.g.
  `/admin` vs `/admin/manage`), error handling, data-fetch patterns, accessibility
  (aria, semantics, reduced-motion), performance (bundle, video lazy-loading,
  re-renders), maintainability, TODOs.
- **Legal** — email compliance (CAN-SPAM: physical address, unsubscribe — note
  this is 1:1 outreach, assess applicability), tracking/cookie disclosure and
  consent for `presentation_views` + `ip_hash`, privacy policy / terms presence,
  the "Confidential · Prepared exclusively for Bartolino's" claim, copyright/®/™
  usage, third-party asset/music/font licensing in the deck, accessibility (ADA)
  exposure.

### Method
- Start each surface by mapping its files and flows, then walk every interactive
  element and state. Where you can, reason about runtime behavior; note anything
  you couldn't verify statically.
- For responsive, reason about each breakpoint (and the dashboard's
  desktop-no-scroll constraint + the deck's pinned sections).
- **Verify findings** — don't report a bug you haven't traced to the code. Mark
  confidence (Confirmed / Likely / Needs-runtime-check).

### Output format
Produce a single report, grouped by the four surfaces, each with a severity-ranked
table:

```
### <Surface>
| # | Severity | Dimension | Finding | File:line | Confidence | Impact | Proposed fix | Effort |
```

- **Severity:** Critical / High / Medium / Low.
- End with a **"Fix first" shortlist** (top ~10 across all surfaces, ordered by
  severity × likelihood × user impact) and a **"Send-blockers"** list (anything
  that should be fixed before sending the deck to a real prospect).
- Call out anything that contradicts Part A (this doc may be out of date).

Do not modify code in this pass. When the report is reviewed, we'll select items
for a fix pass.
