# Claude Code — The Restaurant Creatives (single handoff)

Copy everything below the line into a new Claude Code session when working on this project.

---

```
# Project: The Restaurant Creatives — therestaurantcreatives-pitches

## What this is
A Next.js 15 App Router site (JavaScript, not TypeScript) for The Restaurant Creatives —
a boutique creative studio for restaurants. The repo serves two purposes:
1. A public marketing site (/, /work, /studio, /contact)
2. An internal admin tool for managing and sending client presentation portals (/admin, /signin)

**Live:** https://therestaurantcreatives.com
**Repo:** GitHub → brn4040-prog/therestaurantcreatives-pitches
**Local dev:** `npm run dev` → localhost:3000

---

## Tech stack
- Next.js 15.3 App Router, React 19
- Plain JavaScript (no TypeScript)
- CSS Modules NOT used — each component/page has a co-located .css file imported directly
- Supabase (@supabase/ssr + @supabase/supabase-js) for backend — NOT yet wired to the UI (mock data only)
- GSAP 3.13 + @gsap/react for animations on the public site
- Lenis 1.3 for smooth scroll on public pages only
- next-view-transitions for page transitions
- Google Fonts: Instrument Serif (display/italic), Inter Tight (sans body), DM Mono (code)

---

## File structure
src/
├── app/
│   ├── layout.js              — Root layout, loads globals.css, wraps ClientLayout
│   ├── globals.css            — Design tokens, font imports, base reset
│   ├── page.js / home.css     — Homepage
│   ├── work/                  — Work page
│   ├── studio/                — Studio/about page
│   ├── contact/               — Contact page
│   ├── signin/
│   │   ├── page.js            — Animated login form (CLIENT PORTAL label, email + custom password field)
│   │   └── signin.css         — Sign-in styles
│   ├── admin/
│   │   ├── page.js            — Admin dashboard (all views in one file, mock data)
│   │   └── admin.css          — Admin styles (light theme, sidebar layout)
│   └── api/
│       └── track/[slug]/route.js — POST endpoint for presentation view tracking
├── client-layout.js           — Wraps public pages in Lenis + Chrome + Menu. Short-circuits for /admin and /signin.
├── components/
│   ├── Chrome/                — Fixed top nav bar (logo + live clock)
│   ├── Menu/                  — Overlay nav menu
│   ├── Footer/
│   ├── Marquee/
│   ├── ProcessCards/
│   ├── WhoWeAre/
│   ├── WorkCarousel/
│   ├── BtnLink/
│   ├── Copy/                  — Animated text reveal component
│   ├── DynamicBackground/
│   └── Interactions/          — Custom cursor / scroll interaction layer
└── lib/
    ├── supabase.js             — Browser Supabase client (createBrowserClient)
    └── schema.sql              — Supabase schema (clients, presentations, presentation_views tables + analytics view)

---

## Design system (globals.css tokens)
--background:      #F4EFE8  (warm cream — used on all public pages)
--foreground:      #0A0A0C  (near-black)
--foreground-200:  #6F6968
--foreground-300:  #B5ADA6
--hairline:        rgba(10,10,12,0.14)
--font-italic:     "Instrument Serif"  ← used for all display/headline text
--font-sans:       "Inter Tight"       ← body text
--font-mono:       "DM Mono"

Admin has its own token set (--ad-*) in admin.css with a light gray theme (#F3F4F6 page bg, white cards).

---

## Admin dashboard (/admin)
Single-page app with 4 views toggled by sidebar nav:
- dashboard   — greeting (Instrument Serif italic), 4 stat tiles, Recent Portals list, Pipeline bars, Notes
- portals     — full client list with search
- pipeline    — kanban board (5 stages: Lead, Proposal, Active, Revision, Delivered)
- notes       — full notes manager

State lives entirely in React useState — NO Supabase connection yet, all data is empty arrays.
Key components: Sidebar, PortalRow, SendPanel, StatusBadge, kanban columns.

**What works (verified on live site, May 2026):**
- All 4 views render and navigate correctly
- SendPanel slides in with mailto: link + mark-as-sent
- Copy URL copies to clipboard
- Notes can be added (client-side only)
- Pipeline bars derive pct from actual kanban counts (not hardcoded)
- Toast notifications with cleanup ref

**What's stubbed / not wired yet:**
- "+ Add client" and "+ Create presentation" buttons — no modal, no action
- "+ Add deal" on pipeline — no action
- "..." more menu on portal rows — no dropdown
- Supabase: MOCK_CLIENTS = [], INIT_KANBAN all empty, INIT_NOTES = []
- Authentication: /admin is completely open, no middleware, no session check
- /signin page exists and has the animated UI but calls no real auth — password "wrong" → error demo, anything else → success demo

---

## Sign-in page (/signin)
Custom animated form on the cream (#F4EFE8) background:
- Email field: floating label, straight underline, SVG tick draws in when valid email
- Password field: hidden native <input> overlaid by custom dot-per-keystroke display
  - Dots represented as spans; custom blinking caret positioned via --cursor-x CSS var
  - On ERROR: red sinusoidal SVG wave draws under password dots + dots scatter
  - On SUCCESS: black SVG checkmark draws in on the button
- Demo mode: password === "wrong" → error state; anything else → success
- Does NOT call Supabase auth yet
- No Lenis / Chrome / Menu (client-layout short-circuit)

---

## Tracking API (/api/track/[slug])
POST endpoint. Body: { event: "start"|"end", sessionId: string, duration?: number }
- "start" → inserts row into presentation_views with ip_hash (SHA-256 first 16 chars)
- "end"   → updates row with ended_at + duration_seconds
Uses SUPABASE_SERVICE_ROLE_KEY (server-side). Not yet called by any client code.

---

## Supabase schema (src/lib/schema.sql)
Tables:
- clients(id, name, contact, email, created_at)
- presentations(id, client_id, title, slug, status[draft|sent|live], sent_at, created_at, updated_at)
- presentation_views(id, presentation_id, session_id, ip_hash, started_at, ended_at, duration_seconds)

View: presentation_analytics — aggregates views, avg duration, unique IPs, was_shared flag per presentation.
RLS enabled. Anon policy: can insert presentation_views only.
Schema has NOT been applied to a Supabase project yet — env vars not set.

---

## Live site audit (May 27, 2026)

### Public site — production-ready
- All routes load: /, /work, /studio, /contact
- Cream palette, Instrument Serif headlines, Inter Tight body, Chrome (logo + live clock)
- Work page shows 8 projects; studio/contact CTAs work
- No broken nav observed

### Sign-in — UI only
- Renders correctly on cream, no public chrome
- Demo auth only (not Supabase)

### Admin — UI works, publicly accessible
- /admin loads with NO session (security issue)
- All four views switch correctly; all counts at 0; empty states everywhere
- Buttons visible: + Add client, + Create presentation, + New portal, + Add deal

### Missing / broken on live
- /pitch/[slug] → Next.js 404 (black default page, not branded cream)
- Tracking API never called (no pitch viewer exists)

### Minor observations
- 404 pages use default Next black styling, not brand tokens
- Work page includes non-restaurant clients (Symphony, Revity, etc.) — may be intentional

---

## Open issues (handoff checklist)

| # | Area | Issue | Priority |
|---|------|-------|----------|
| 1 | Auth | `/admin` publicly accessible — no middleware, no session | **P0** |
| 2 | Data | Mock empty arrays — Supabase not connected | P1 |
| 3 | Actions | "+ Add client", "+ Create presentation", "+ Add deal" dead | P1 |
| 4 | Route | `/pitch/[slug]` client presentation page missing | P1 |
| 5 | Tracking | `/api/track/[slug]` exists but nothing calls it | P2 |
| 6 | Env | Supabase env vars not set — calls would throw | P0 (blocker for 1–5) |
| 7 | Schema | `schema.sql` not applied to Supabase project | P0 (blocker) |
| 8 | UI | `...` menu on portal rows — no handler | P3 |
| 9 | Sign-in | Demo only — need `signInWithPassword()` | P0 (with #1) |

---

## Recommended build order

Do these in sequence. Do not skip Supabase setup if wiring auth or admin data.

### Phase 0 — Foundation (blocker for everything else)
1. Create Supabase project
2. Run `src/lib/schema.sql`
3. Set env on Vercel + `.env.local`:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
4. Create at least one admin user in Supabase Auth (email/password)

### Phase 1 — Security (do immediately after Phase 0)
1. Add `middleware.js` — protect `/admin`, redirect unauthenticated → `/signin`
2. Wire `/signin` to `supabase.auth.signInWithPassword()` via @supabase/ssr
3. Remove demo password logic ("wrong" / success fake states) once real auth works
4. Implement sign-out on admin sidebar (clear session)

### Phase 2 — Admin data
1. Replace MOCK_CLIENTS / INIT_KANBAN / INIT_NOTES with Supabase queries
2. Build modals: "+ Add client", "+ Create presentation", "+ Add deal"
3. Wire PortalRow, SendPanel, kanban drag-or-status updates to DB
4. Hook "..." menu on portal rows (edit, archive, copy slug, etc.)

### Phase 3 — Client-facing pitch
1. Create `app/pitch/[slug]/page.js` (+ styles) — presentation viewer
2. Fetch presentation by slug; 404 if not found (use branded cream 404, not default black)
3. Client component: POST `/api/track/[slug]` on mount (event: start) and unmount (event: end + duration)
4. Pitch route should NOT use Lenis/Chrome/Menu (like admin/signin) OR use minimal chrome — decide with product

### Phase 4 — Polish
1. Branded `not-found.js` for cream 404 sitewide
2. RLS policies review for presentations (who can read live pitches)
3. Production smoke test on Vercel

---

## Env vars needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Conventions (follow strictly)
- No TypeScript — plain .js / .jsx only
- No CSS modules — import './component.css' directly
- Component per folder: /components/Name/Name.jsx + Name.css
- Stub buttons are intentional until that feature ships — wire them, don't delete
- Admin CSS uses --ad-* prefix (never collide with globals.css tokens)
- client-layout.js: isAppRoute = pathname starts with /admin or /signin → return children bare (no Lenis, Chrome, Menu)
- No emojis in UI unless explicitly requested
- Match existing patterns before adding new abstractions; minimal diff per task

---

## How to start a Claude Code session

Pick ONE phase and say exactly what to do. Examples:

**Phase 0:**
> Apply src/lib/schema.sql to Supabase. Add .env.example with the three Supabase vars. Document Vercel env setup in README.

**Phase 1:**
> Add Next.js middleware protecting /admin. Wire /signin to supabase.auth.signInWithPassword using @supabase/ssr. Remove demo password logic. Env vars are set.

**Phase 2:**
> Replace admin mock state with Supabase queries for clients, presentations, kanban, and notes. Add modals for Add client and Create presentation.

**Phase 3:**
> Build app/pitch/[slug]/page.js — fetch presentation by slug, render viewer, call POST /api/track/[slug] on mount/unmount. Branded 404 if slug missing.

---

## What NOT to do unless asked
- Do not refactor unrelated public pages or GSAP animations
- Do not convert to TypeScript
- Do not add CSS modules
- Do not remove stub buttons — wire them when building that feature
- Do not commit .env files or secrets

---

## Current status summary
**Shipped:** Marketing site (4 pages), sign-in UI (demo), admin UI (4 views, client-side only), tracking API route (server-ready).
**Not shipped:** Auth, Supabase wiring, pitch viewer, tracking client, modals, production security.
**Biggest risk on production today:** /admin is open to anyone with the URL.
```

---

*Last updated: May 27, 2026 — includes live audit of therestaurantcreatives.com*
