# thepostpal — Project Brief

Drop this into a Claude chat for full context on the project.

## What It Is
**thepostpal** is a social media content creation and publishing platform for real estate agents. Built for Angie Nichols (Realtor, West County St. Louis) but designed to scale as a multi-agent SaaS product.

## Tech Stack
- **Framework:** Next.js 15 App Router, TypeScript
- **Styling:** Tailwind CSS + custom glassmorphism (frosted glass UI throughout)
- **State:** localStorage for settings, Meta connection tokens, and preferences
- **APIs:** Meta Graph API v21.0 (Facebook + Instagram OAuth, publishing)
- **Location:** `~/Downloads/angie-social-portal/`

## What's Built

### Dashboard (`/dashboard`)
- Bento grid layout with frosted glass cards
- **Quick Action buttons** — New Listing, Just Sold, Holiday, Engage — link directly to template editor or filtered template browse
- **New Post slideshow** — auto-rotating template previews
- **AI Assistant card** — custom canvas waveform animation background, animated glow border
- **Mini calendar**, library stats, listing videos section
- Responsive: 4-col desktop, 2-col iPad, 1-col mobile with hamburger nav + slide-out drawer
- Frosted glass sidebar navigation

### Templates (`/dashboard/templates`)
- **23 templates** across pillars:
  - Market Clarity, Buyer/Seller Tips, Neighborhood/Lifestyle, Angie Personal, Local Life, Neighborhood Life, Stories/Reels, Home + Lifestyle
  - New Listing (2), Just Sold (2)
  - Holiday: Memorial Day, Fourth of July, Labor Day, Halloween, Thanksgiving, Christmas
  - Seasonal: Spring, Summer, Fall, Winter
- Grid/list view toggle, search, pillar filter (supports URL param `?pillar=Holiday`)
- Template data in `/src/lib/templates.ts`

### Template Editor (`/editor/[templateId]`)
- Live preview with real-time field editing
- Photo upload (drag & drop or click)
- Character limits per field
- Download as PNG
- **Post to Social** button (when Meta connected) with platform selector (Facebook, Instagram, Both)
- Schedule Post link, Back to Templates link

### Meta/Social Integration
- **OAuth flow:** Connect with Facebook button → Meta login → callback exchanges code for long-lived token → stores in localStorage
- **Publishing:** Editor sends caption + image to `/api/meta/publish` → posts to Facebook Page and/or Instagram Business Account
- **Files:**
  - `/src/lib/meta.ts` — Graph API functions (login URL, token exchange, pages, IG account, publish)
  - `/src/lib/meta-store.ts` — localStorage connection store
  - `/src/app/api/meta/callback/route.ts` — OAuth callback
  - `/src/app/api/meta/publish/route.ts` — Publish endpoint
- **Needs:** Meta Developer App credentials in `.env.local` (`NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`)
- **Known limitation:** Editor sends data URLs; production needs public image URLs (S3/Cloudinary)

### Other Pages
- **Reports** (`/dashboard/reports`) — Content activity with time range filtering
- **Settings** (`/dashboard/settings`) — Profile, Posting, Notifications, Account tabs. Account has Meta connect/disconnect UI, Coming Soon badges for Change Password
- **Calendar, Photos, Videos, AI Assistant, Creator Studio, My Brand, Facebook, Instagram** — sidebar nav items (some are stubs)

## Key Design Patterns
- **Glassmorphism everywhere:** `backdrop-filter: blur(24px) saturate(1.4)`, semi-transparent gradients, rgba borders, inset box-shadows — applied via `.bento-card` class in `globals.css` and inline on sidebar
- **Hover effects:** Data-attribute selectors with `!important` to overcome Tailwind specificity
- **Canvas animation:** Custom `WaveformCanvas` component — flowing sine-wave lines with color cycling, used as AI Assistant card background
- **Responsive:** Tailwind `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, CSS media queries for sidebar visibility

## Key Files
```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx          # Main dashboard bento grid
│   │   ├── templates/page.tsx # Template browse
│   │   ├── settings/page.tsx  # Settings with Meta connect
│   │   └── reports/page.tsx   # Reports
│   ├── editor/[templateId]/page.tsx  # Template editor
│   ├── api/meta/
│   │   ├── callback/route.ts  # OAuth callback
│   │   └── publish/route.ts   # Publish endpoint
│   └── globals.css            # Global styles incl glassmorphism
├── components/
│   ├── DashboardShell.tsx     # Layout with frosted sidebar + mobile nav
│   └── WaveformCanvas.tsx     # Canvas waveform animation
└── lib/
    ├── templates.ts           # 23 template definitions
    ├── meta.ts                # Meta Graph API functions
    └── meta-store.ts          # Meta connection localStorage
```

## What's Next (Potential)
- Image hosting pipeline (S3/Cloudinary) for Meta publishing
- More template designs
- AI caption generation
- Scheduling/calendar integration
- Multi-agent SaaS (onboarding, billing, per-agent branding)
- Mobile app
