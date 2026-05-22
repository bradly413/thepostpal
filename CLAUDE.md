# thepostpal (Posterboy Social)

@AGENTS.md

## Project Overview

Real estate social media content platform. Built for Angie Nichols (Realtor, West County St. Louis), scaling to multi-agent SaaS under the brand "Posterboy Social" (posterboysocial.com).

**Stack:** Next.js 16.2.6 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, GSAP 3.15, localStorage state.

**Location:** `~/Code/thepostpal-readable-v2/`

## Running Locally

```bash
npm run dev          # http://127.0.0.1:8240
```

Login: `/sign-in` — `demo` / `demo123` (see PORTAL_USERNAME/PORTAL_PASSWORD in .env.local)

**Claude handoff:** `docs/CLAUDE-UPDATE-2026-05-22.md` (latest), `docs/CLAUDE-SESSION-HANDOFF.md`

## Architecture

### Pages & Routes

| Route | Purpose | Key Details |
|-------|---------|-------------|
| `/` | Marketing homepage | `MarketingSite` — scroll sections, pricing, sign-in CTA |
| `/sign-in` | Login / signup | JWT auth |
| `/onboarding` | Brand onboarding wizard | Multi-step form, not yet wired to Prisma |
| `/dashboard` | Main bento grid dashboard | Quick actions, AI assistant card, calendar, stats |
| `/dashboard/studio` | **Posterboy Studio** | AI image generation (Gemini), particle reveal animation, Leonardo upscale/remove-bg |
| `/dashboard/templates` | Template gallery | 23 templates, pillar filters, grid/list toggle |
| `/dashboard/ai-assistant` | AI chat | Anthropic Claude API, custom prompt input |
| `/dashboard/calendar` | Content calendar | Events, holidays, scheduling |
| `/dashboard/photos` | Photo library | Upload, browse |
| `/dashboard/videos` | Video library | Vimeo integration |
| `/dashboard/brand` | My Brand page | Brand book display |
| `/dashboard/settings` | Settings | Profile, posting prefs, Meta connect |
| `/dashboard/editor/[templateId]` | Template editor | Live preview, photo upload, download PNG, post to social |
| `/dashboard/facebook` | Facebook analytics | Meta Graph API |
| `/dashboard/instagram` | Instagram analytics | Meta Graph API |
| `/dashboard/reports` | Content reports | Activity with time range |
| `/dashboard/feedback` | Beta feedback | User-submitted feedback |

### API Routes

| Endpoint | Purpose |
|----------|---------|
| `POST /api/generate-image` | Gemini 2.5 Flash image generation (rate limited: 10/60s/IP) |
| `POST /api/leonardo/edit` | Leonardo.ai image editing (upscale, remove-bg, inpaint) |
| `GET /api/leonardo/status` | Poll Leonardo async job status |
| `POST /api/leonardo/upload` | Upload image to Leonardo for editing |
| `POST /api/ai` | Anthropic Claude chat completions |
| `POST /api/enhance-prompt` | AI prompt enhancement |
| `GET/POST /api/meta/callback` | Meta OAuth callback |
| `POST /api/meta/publish` | Publish to Facebook/Instagram |
| `GET /api/meta/insights` | Meta analytics |
| `POST /api/auth` | Login |
| `POST /api/auth/signup` | Signup |
| `POST /api/feedback` | Submit feedback |
| `GET/POST /api/knowledge` | Knowledge base CRUD |
| `POST /api/onboarding` | Onboarding data |
| `POST /api/upload` | File upload |
| `GET /api/vimeo/videos` | Vimeo video list |

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `DashboardShell` | `src/components/DashboardShell.tsx` | Frosted glass sidebar, mobile drawer, page transitions |
| `ParticleReveal` | `src/components/ParticleReveal.tsx` | Canvas 2D + GSAP particle loading animation for Studio |
| `WaveformCanvas` | `src/components/WaveformCanvas.tsx` | Flowing sine-wave canvas animation (AI card background) |
| `AuroraCanvas` | `src/components/AuroraCanvas.tsx` | Aurora borealis background effect |
| `TemplateCanvas` | `src/components/TemplateCanvas.tsx` | Template rendering on canvas |
| `SocialMockup` | `src/components/SocialMockup.tsx` | Social media post preview mockup |
| `PageTransition` | `src/components/PageTransition.tsx` | Route transition animations |
| `FeedbackWidget` | `src/components/FeedbackWidget.tsx` | Fixed bottom-right feedback button |

### Key Libraries

| Lib | File | Purpose |
|-----|------|---------|
| `meta.ts` | `src/lib/meta.ts` | Meta Graph API v21.0 (OAuth, pages, IG account, publish) |
| `meta-store.ts` | `src/lib/meta-store.ts` | Meta connection localStorage |
| `templates.ts` | `src/lib/templates.ts` | 23 template definitions |
| `design-templates.ts` | `src/lib/design-templates.ts` | Design template variants |
| `brand-knowledge.ts` | `src/lib/brand-knowledge.ts` | Brand voice and messaging data |
| `auth.ts` | `src/lib/auth.ts` | JWT auth with jose |
| `rate-limit.ts` | `src/lib/rate-limit.ts` | IP-based rate limiting |
| `onboarding-agent.ts` | `src/lib/onboarding-agent.ts` | Onboarding flow logic |
| `holidays.ts` | `src/lib/holidays.ts` | Holiday date definitions |
| `vimeo.ts` | `src/lib/vimeo.ts` | Vimeo API client |
| `photo-store.ts` | `src/lib/photo-store.ts` | Photo library localStorage |
| `schedule-store.ts` | `src/lib/schedule-store.ts` | Schedule localStorage |
| `events-store.ts` | `src/lib/events-store.ts` | Calendar events localStorage |
| `knowledge-store.ts` | `src/lib/knowledge-store.ts` | Knowledge base localStorage |
| `feedback-store.ts` | `src/lib/feedback-store.ts` | Feedback localStorage |
| `brand-book-schema.ts` | `src/lib/brand-book-schema.ts` | Brand book TypeScript schema |

## Design System

### Visual Language
- **Glassmorphism everywhere**: `backdrop-filter: blur(24px) saturate(1.4)`, semi-transparent gradients, rgba borders, inset box-shadows
- **Accent color**: `#D4A853` (warm gold) — used for buttons, highlights, particle animation palette
- **Background**: Dark theme with `bg-[#0c0c0e]` base
- **Cards**: `.bento-card` class in globals.css
- **No emojis in UI** — user/owner preference

### Typography
- Custom fonts loaded via Next.js
- Clean, minimal text hierarchy

### Responsive Breakpoints
- Desktop: 4-column bento grid
- Tablet (md): 2-column grid
- Mobile: 1-column with hamburger nav + slide-out drawer

## Posterboy Studio (`/dashboard/studio`)

The flagship feature. AI image generation with a signature particle loading animation.

### Flow
1. User types a prompt + selects style/size
2. Clicks "Generate"
3. **Particle animation starts** — 2000 gold particles swirl in a vortex
4. API call to `/api/generate-image` (Gemini 2.5 Flash)
5. Image data returns as base64 data URI
6. **Particles coalesce** — each particle moves to a pixel-sampled position and takes on the image's colors
7. **Reveal** — canvas fades out, actual image fades in
8. User can then Upscale HD or Remove BG (Leonardo.ai)

### ParticleReveal Component
- Canvas 2D + GSAP (no Three.js — not installed)
- ~2000 particles with warm gold/amber palette
- 4 phases: SPAWN -> SWIRL -> COALESCE -> REVEAL
- Uses `dimsRef` for logical (CSS) pixel dimensions, separate from DPR-scaled canvas
- GSAP animates coalesce positions/colors, rAF loop handles rendering
- Props: `{ active, imageUrl, onComplete }`

### Studio State
- `loading` — API call in flight
- `showParticles` — particle animation active
- `particleImageUrl` — triggers coalesce when set
- `pendingImageRef` — holds generated image data until animation completes
- `generated[]` — array of generated images (carousel with slide transitions)

### Leonardo.ai Integration
Three API routes for image editing:
- **Upscale**: `/api/leonardo/edit` with `action: "upscale"` -> polls `/api/leonardo/status`
- **Remove BG**: `/api/leonardo/edit` with `action: "remove-bg"` -> polls status
- **Upload**: `/api/leonardo/upload` — uploads base64 image to Leonardo, returns `imageId`

Flow: Upload image -> get imageId -> trigger edit action -> poll status -> get result URL

## Environment Variables

```
# Auth
PORTAL_USERNAME=demo
PORTAL_PASSWORD=demo123
AUTH_SECRET=<jwt-secret>

# AI
ANTHROPIC_API_KEY=<key>
GEMINI_API_KEY=<key>
LEONARDO_API_KEY=<key>

# Meta (Facebook/Instagram)
NEXT_PUBLIC_META_APP_ID=<id>
META_APP_SECRET=<secret>

# Vimeo
VIMEO_ACCESS_TOKEN=<token>

# Upstash Redis (rate limiting)
KV_REST_API_TOKEN=<token>
KV_REST_API_URL=<url>

# Vercel
VERCEL_OIDC_TOKEN=<token>
```

## Known Issues & TODOs

### Critical
- [ ] Middleware PUBLIC_PATHS bypass was added for dev — needs to be reverted for production
- [ ] Onboarding form not wired to Prisma (data doesn't persist)
- [ ] Meta publishing sends data URLs — production needs public image URLs (S3/Cloudinary)
- [ ] Gemini API free tier has daily quota limits (429 errors)

### Moderate
- [ ] `HERO_SLIDES` has 3 of 4 items with `src: ""` — shows empty gradient placeholders
- [ ] `FALLBACK_VIDEOS` has `src: ""` for all items — blank if Vimeo fails
- [ ] `window.confirm()` used for delete in Calendar — breaks glassmorphism aesthetic
- [ ] Sidebar nav highlight uses hardcoded dark color, may break in light mode
- [ ] Template gallery needs publishing pipeline (template -> published post)

### Minor (see AUDIT-REPORT.md for full list)
- Various accessibility issues (missing aria labels, nested buttons, no focus trap on mobile drawer)
- `eslint-disable @next/next/no-img-element` throughout — using `<img>` instead of `next/image`
- No test coverage

## Deployment

- **Vercel**: Project "angie-social-portal" on bradly413s-projects
- **Domain**: [posterboysocial.com](https://www.posterboysocial.com) (canonical; apex redirects to www)
- **Not used**: theposterboy.com (separate unrelated site)
- **Branch**: main
- Run `npm run build` before deploying to catch type errors

## File Structure

```
src/
  app/
    api/                    # API routes
      ai/                   # Claude chat
      auth/                 # Login/signup
      enhance-prompt/       # Prompt enhancement
      feedback/             # Feedback
      generate-image/       # Gemini image gen
      knowledge/            # Knowledge CRUD
      leonardo/             # Leonardo.ai (edit, status, upload)
      meta/                 # Meta OAuth + publish
      onboarding/           # Onboarding
      upload/               # File upload
      vimeo/                # Vimeo videos
    dashboard/              # All dashboard pages
      page.tsx              # Main bento grid
      studio/page.tsx       # Posterboy Studio (image gen)
      templates/page.tsx    # Template gallery
      editor/[templateId]   # Template editor
      ai-assistant/         # AI chat
      calendar/             # Content calendar
      settings/             # Settings
    editor/[templateId]     # Legacy editor route
    onboarding/             # Onboarding wizard
    layout.tsx              # Root layout
    page.tsx                # Login page
    globals.css             # Global styles + glassmorphism
  components/
    DashboardShell.tsx      # Sidebar + layout wrapper
    ParticleReveal.tsx      # Studio particle animation
    WaveformCanvas.tsx      # AI card waveform
    AuroraCanvas.tsx        # Aurora effect
    TemplateCanvas.tsx      # Template renderer
    SocialMockup.tsx        # Social post preview
    PageTransition.tsx      # Route transitions
    FeedbackWidget.tsx      # Feedback button
  lib/
    auth.ts                 # JWT auth
    meta.ts                 # Meta Graph API
    meta-store.ts           # Meta localStorage
    templates.ts            # 23 template defs
    design-templates.ts     # Design variants
    brand-knowledge.ts      # Brand data
    brand-book-schema.ts    # Brand schema
    brand-books/            # Per-agent brand books
    rate-limit.ts           # Rate limiting
    holidays.ts             # Holiday dates
    vimeo.ts                # Vimeo client
    onboarding-agent.ts     # Onboarding logic
    social-detect.ts        # Social platform detection
    mockup-library.ts       # Mockup templates
    photo-store.ts          # Photos localStorage
    schedule-store.ts       # Schedule localStorage
    events-store.ts         # Events localStorage
    knowledge-store.ts      # Knowledge localStorage
    feedback-store.ts       # Feedback localStorage
  middleware.ts             # Auth middleware
knowledge/                  # JSON knowledge files for AI
docs/                       # Architecture decisions
prisma/                     # Database schema (not yet active)
public/                     # Static assets
```

## Prisma (Not Yet Active)

Prisma schema exists in `/prisma/` with migrations but is NOT currently used. All state is in localStorage. The plan is to migrate to Prisma + PostgreSQL for:
- User accounts
- Brand data persistence
- Generated images
- Scheduled posts
- Multi-agent support

## Brand Details (Angie Nichols)

- **Agent**: Angie Nichols, Realtor
- **Market**: West County, St. Louis, MO
- **Brokerage**: Coldwell Banker Realty
- **Brand colors**: Warm gold (#D4A853), cream, deep brown
- **Voice**: Professional, warm, neighborhood-expert
- **Content pillars**: Market Clarity, Buyer/Seller Tips, Neighborhood Life, Personal, Local, Holiday
- **Brand book**: `src/lib/brand-books/angie-nichols.ts`
