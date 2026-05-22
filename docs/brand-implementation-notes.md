# Brand Implementation Notes

## Color tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Ink | `#111111` | Primary text, buttons, nav |
| Bone | `#F4EFE5` | Secondary surfaces, footer |
| Press Red | `#D9352B` | Accent — sparingly, like a proofreader's pen |
| Paper | `#FAF7F1` | Marketing background |

CSS variables in `globals.css`: `--color-pb-ink`, `--color-pb-bone`, `--color-pb-press`, `--color-pb-paper`.

Dashboard retains existing glass theme for logged-in app; posterboy product pages use editorial Paper/Ink palette via `.pb-marketing` and `.pb-app` classes.

## Typography

| Role | Font | Variable |
|------|------|----------|
| Display / headlines | Instrument Serif | `--font-instrument-serif` |
| Body / UI | Geist (Inter fallback) | `--font-geist` |

Loaded in `src/app/layout.tsx`.

## Product language

| Use this | Not this |
|----------|----------|
| Drafts | Posts queue, Content calendar items |
| The Editor | Composer, Creator |
| Dispatch | Schedule, Calendar |
| Issues | Batches, Campaigns (public UI) |
| Press | Publish, Approve & post |

## Microcopy reference

See `src/lib/posterboy-copy.ts` for canonical strings.

Examples:
- Empty drafts: "Nothing in the drafts. Probably a good week."
- Save toast: "Saved. Quietly."
- Logout: "See you out there."

## Logo / name usage

- Always lowercase: **posterboy**
- First prominent legal mention may use posterboy™
- Never: Posterboy, POSTERBOY, PosterBoy

## UI do / don't

**Do:**
- Editorial layout with generous margins
- Quiet ratios, calm copy
- Red accent used sparingly
- Short sentences in UI

**Don't:**
- Pop-ups, confetti, busy gradients
- Exclamation-heavy buttons
- Streak counters, leaderboards
- "Crush it" / "Go viral" / hustle language
- Generic SaaS purple gradients
- Emoji in product UI

## Motion (marketing)

Restrained scroll on `(marketing)` routes via `MarketingMotion.tsx`:

- **Lenis** — subtle smooth scroll (lerp 0.09)
- **ScrollTrigger** — section fade-up reveals, staggered draft lines / steps
- **Scroll indicator** — 1px ink bar on right (desktop only)
- **`--vh` / `--svh`** — set on resize for mobile height consistency
- **`prefers-reduced-motion`** — animations disabled, content shown immediately

Not used (intentionally): full-page pin, Three.js, SplitText, custom cursor, gradient cycling, body scroll lock.


| Area | Files |
|------|-------|
| Copy constants | `src/lib/posterboy-copy.ts` |
| Brand tokens | `src/lib/posterboy-brand.ts` |
| Pricing data | `src/lib/pricing.ts` |
| Marketing site | `src/app/(marketing)/` |
| Product workflow | `src/app/dashboard/drafts`, `dispatch`, `editor`, `issues` |
| Multi-location | `src/app/dashboard/organization` |
| Brand intake | `src/app/dashboard/brand-intake` |
