# Claude session handoff — posterboy / thepostpal-readable-v2

> **Newer (2026-05-22):** See **`docs/CLAUDE-UPDATE-2026-05-22.md`** for beta marketing, dashboard scroll fix, Lenis/GSAP, deploy, and architecture truth.

Copy everything below the line into a new Claude conversation when continuing this work.

---

## Context prompt (paste below)

You are helping Brad Nichols on **posterboy** (brand: **Posterboy Social**, domain **posterboysocial.com**), a real-estate-focused social content SaaS originally built for Angie Nichols (Coldwell Banker, West County St. Louis), scaling to multi-agent use.

**Repo:** `~/Code/thepostpal-readable-v2/`  
**Read first:** `CLAUDE.md`, `AGENTS.md` (Next.js 16 has breaking changes — check `node_modules/next/dist/docs/` before changing framework code).

### Stack
- Next.js **16.2.6** (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS **v4**, GSAP **3.15** + ScrollTrigger + `@gsap/react`
- Auth: JWT via `jose`, middleware in `src/middleware.ts`
- **Prisma schema exists but is NOT active** — dashboard state is mostly `localStorage`
- Deploy: Vercel project `angie-social-portal`, branch `main`

### Dev
```bash
npm run dev
```
Login (app): `/sign-in` — `demo` / `demo123` (`.env.local`: `PORTAL_USERNAME`, `PORTAL_PASSWORD`)

---

## What we are doing NOW (May 2026)

**Primary focus:** Rebuilding the **public marketing homepage** from a Kimi/Vite design dump (`~/Downloads/posterboy-cursor-dump.md`), replacing the older Inkwell-style `PosterboyExperience` WebGL homepage.

**Homepage route:** `src/app/(marketing)/page.tsx` → `MarketingSite` (`src/components/marketing/MarketingSite.tsx`)

### Marketing page sections (top to bottom)
| Section | File | Notes |
|---------|------|--------|
| Nav | `Navigation.tsx` | |
| Hero | `sections/Hero.tsx` | “Post like you [icon] like it.” — GSAP pin + scroll |
| Carousel | `sections/CarouselSection.tsx` | Horizontal pinned gallery, `#problem` |
| Manifesto | `ScrollWordReveal.tsx` | Sticky word color reveal |
| Solution | `Solution.tsx` | Flowchart |
| Word scroll | `WordScroll.tsx` | |
| Holographic feature | `HolographicFeature.tsx` | |
| Founder | `FounderCard.tsx` | |
| Pricing | `sections/Pricing.tsx` | **Good / Better / Best** ($29 / $59 / $99) on homepage |
| Footer | `Footer.tsx` | |
| Chat | `ChatbotWidget.tsx` | |

**Scroll infrastructure:** `MarketingScrollProvider.tsx`, `src/lib/marketing-scroll-engine.ts`, styles in `src/styles/posterboy-marketing.css`

**Images:** `src/lib/marketing-images.ts` + `public/images/`. Carousel/hero photos are **SVG placeholders** except the brand icon (see below).

---

## Brand assets (important)

- **Official app icon (hero):** `public/images/posterboy-app-icon.png` — red squircle + white paper plane (150×150). Used via `PosterboyAppIcon.tsx` → `MARKETING_IMAGES.appIcon`.
- **Do NOT use** `posterboy-icon.png` in the hero — that file is the full brand guidelines sheet (wordmark + variants).
- **Do NOT use** the hand-drawn `posterboy-app-icon.svg` for hero — it was an approximation.
- User asset source was: `postboy-icon-daaa8bfd-9ce7-4579-a744-a00aeb495178.png`

---

## Recent fixes & current behavior

### Middleware (critical)
`/images/*` must be public or hero/carousel images 307 to `/sign-in`.  
`src/middleware.ts`: `PUBLIC_PREFIXES` includes `/images/`; matcher excludes `images/`.

### Hero animation (latest)
- **Removed** dual-layer fullscreen “expand” icon (caused stretched/cut-off icon on scroll-back).
- **Current:** single icon in headline; on scroll — words split apart (`xPercent` ±115), icon scales ~2.35× with drop shadow, fades out; pin `end: "+=58%"`, hero height ~92vh.
- Reset on `onEnterBack` / `onLeaveBack` with `clearProps` on transforms.

### Carousel (latest)
- Pinned horizontal scroll (Kimi-style): `pin: wrap`, `x: -getMaxScroll()`, `start: "top top"`.
- Glass overlay cards, 3D tilt on active card, numbered badges.
- Tighter vertical padding than before.

### Removed / avoided
- **Lenis** smooth scroll — conflicted with multiple ScrollTrigger pins; use native scroll.
- **`containerAnimation`** on carousel 3D — was glitchy; simplified to progress-based card highlight.

### Debug instrumentation (temporary — remove when stable)
- `src/lib/marketing-debug.ts`
- `MarketingSiteHealthProbe.tsx` (mounted in `MarketingSite.tsx`)
- `marketingDbg()` calls in `Hero.tsx`, `CarouselSection.tsx`, `PosterboyAppIcon.tsx`  
→ fold/remove before production.

---

## Known gaps / TODO

1. **Replace placeholder SVGs** in carousel/sections with real JPGs (same basenames in `marketing-images.ts`).
2. **Homepage pricing** ($29/$59/$99) may not match **`/pricing`** route** (older Solo/Shop/Press tiers) — align if product wants one story.
3. **CLAUDE.md is partially stale** — says `/` is login; marketing homepage is now `/` and login is `/sign-in`.
4. **PosterboyExperience** (`src/components/experience/`) still in repo but **not** used on `/`.
5. Dashboard todos unchanged: Prisma not wired, Meta publish needs public image URLs, middleware PUBLIC_PATHS dev bypass, etc. (see `CLAUDE.md`).
6. User may still want **hero animation polish** and **real carousel photography** — last feedback was about zoom direction, stretch on scroll-back, carousel direction/cards, dead space (addressed in code; needs visual QA).

---

## Design system (marketing)
- Glassmorphism, warm gold accent `#D4A853`, dark ink `#080808`, paper `#F7F4EE`
- Fonts: Playfair Display + Instrument Sans (`src/app/layout.tsx`)
- **No emojis in UI** (owner preference)
- `.bento-card`, `--vh` CSS variable set in `MarketingScrollProvider`

---

## Key files quick map
```
src/app/(marketing)/page.tsx          # Homepage
src/components/marketing/             # Marketing site
src/styles/posterboy-marketing.css
src/middleware.ts
src/lib/marketing-images.ts
public/images/posterboy-app-icon.png
docs/ (this file)
~/Downloads/posterboy-cursor-dump.md  # Original Kimi design reference
```

---

## How to work with Brad
- Minimize scope; match existing patterns.
- Don’t commit unless asked.
- Next.js 16: read framework docs before assuming APIs.
- Prefer fixing root cause over defensive hacks.
- After marketing changes: `npm run build` before deploy.

**Ask Brad:** What is the single highest-priority task for this session? (e.g. swap real carousel photos, polish hero, wire `/pricing`, dashboard work, remove debug logs)
