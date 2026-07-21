# Plan — Rebuild the Posterboy marketing site

Goal: completely redo `posterboysocial.com` (the `(marketing)` route group) with a clean, purpose-built structure. **Keep the exact style, color, and fonts** — this is a re-architecture, not a rebrand.

## Why redo (current state)
The live home is `PosterboyCodexHome` — by its own comment, "the **exact TRC CodexHome page shell (duplicated CSS)**" with Posterboy content pasted in. Concretely:
- **It's a fork of The Restaurant Creatives' site.** `codex-home.css` (~2,500 lines) is TRC's shell duplicated wholesale, then `posterboy-overrides.css` (~900 lines) patches it toward Posterboy by overriding `#ee2532` in ~30 scattered places.
- **Token drift / bug:** `codex-home.css` defaults `--accent: #E1062C` (wrong red), `--ink: #1A1A1A`; `posterboy-overrides.css` sets `--accent: #ee2532`, `--ink: #141418`. Two reds, two inks — anything the override misses renders in TRC's color.
- **Two parallel section systems:** `sections/` (16 files) and `codex/` (7 files, the live ones). Several `sections/` are fully orphaned (0 imports): `StudioFlow`, `ScatteredCards`, `SchedulingCalendar`, `AgencyMoat`, `DashboardZoomSection`. Dead code to delete.
- Net: the site is hard to change confidently, colors leak, and half the components are unused. A clean rebuild is cheaper than untangling it.

## LOCK FIRST — the design system to preserve (single source of truth)
Before building anything, extract these into ONE token file (`src/styles/posterboy-brand.css`) and delete the competing definitions.

| Token | Value | Notes |
|-------|-------|-------|
| Accent red | `#ee2532` | primary CTA / accent. Kill every `#E1062C`. |
| Accent deep | `#c81e2a` | hovers, pressed |
| Ink | `#141418` | headlines / body text (pick this, drop `#1A1A1A`) |
| Paper/bg | current marketing light bg + faint red radial glow top-right | matches app frame |
| Success green | `#1f9d4d` | metrics only |
| Body / headline font | **Instrument Sans** (`--font-instrument-sans`), Inter fallback | all text |
| Logo font | **Instrument Serif** | the `posterboy` wordmark ONLY — never section headings |
| Playfair Display | currently imported | **decide:** drop it (redundant with Instrument Serif) unless a specific display use is kept |
| Motion | GSAP scroll reveals, respect `prefers-reduced-motion` | keep the editorial feel |
| No emojis in UI | — | brand rule |

Rule that caused the drift: **stop overriding a foreign shell.** Build from the Posterboy tokens directly.

## New architecture
```
src/app/(marketing)/
  layout.tsx            # loads ONE brand css + fonts, nav, footer
  page.tsx              # composes the home from clean sections
src/components/marketing/
  Nav.tsx  Footer.tsx  CTA.tsx  ChatbotWidget.tsx (keep)
  home/
    Hero.tsx           # the content-ring hero (keep the concept, rebuild clean)
    FeatureBulk.tsx     # ← slide 1 from the hero brainstorm
    FeatureStudio.tsx   # ← slide 2
    FeatureCaption.tsx  # ← slide 3
    Proof.tsx  Pricing.tsx  Alternatives.tsx  FinalCTA.tsx
src/styles/
  posterboy-brand.css  # tokens ONLY
  marketing.css        # layout/section styles built on the tokens
```
Delete after cutover: `codex/`, the orphaned `sections/*`, `codex-home.css`, `posterboy-overrides.css`, `sticky-service-cards.css`.

## Home page section order (new)
1. **Nav** — `posterboy` serif mark, HOW / FEATURES / PRICING, Sign in.
2. **Hero** — content-as-hero (the rotating ring of real posts is strong; keep it, rebuild clean) + headline "Post less. Sell more." + primary CTA.
3. **Feature 1 — Bulk upload:** "Drop the whole batch. Get a month scheduled." (photos cascade into the thumbnail calendar we just built).
4. **Feature 2 — Creator Studio:** "Describe the shot. We make it." (particle-reveal image gen).
5. **Feature 3 — Auto caption:** "It reads your photo. It writes like you." (vision captions + option cards).
6. **Proof / built-for** — who it's for (restaurants, local business), trust.
7. **Alternatives** — why not a VA / Buffer / doing it yourself.
8. **Pricing** — Solo vs Command.
9. **Final CTA** + Footer.

(Slides 3–5 are the three-hero brainstorm, now living as scroll sections. The "keep the same style" requirement means these reuse the locked tokens + Instrument Sans + red accent.)

## Build phases (incremental, never breaks prod)
1. **Extract tokens** → `posterboy-brand.css`; audit every `#E1062C`/`#1A1A1A` and unify. (small, safe)
2. **Build the new home behind a flag/route** — e.g. `(marketing)/preview` or a `NEXT_PUBLIC_MARKETING_V2` flag, so `/` stays live while building.
3. **Rebuild sections** one at a time (Nav → Hero → 3 features → proof → pricing → footer), each verified in the browser.
4. **Cutover:** point `page.tsx` at the new composition; keep old code one commit for rollback.
5. **Delete** the TRC fork + orphaned sections.
6. **Verify:** `npm run build`, Lighthouse (LCP < 2.5s — the ring/GSAP is the risk), mobile pass, both light/dark if applicable, `./scripts/smoke-prod.sh` after deploy.

## Content / copy (keep the voice)
- Tagline stays "Post less. Sell more." Plain, direct, no "elevate/seamless/unleash," no em-dashes in shipped copy.
- Use **real Posterboy-made posts** for the hero ring and proof (authenticity). Generated art only for conceptual bits (particle reveal, falling-photos motion).

## Risks & guardrails
- **Shared working tree:** the calendar/composer batch is still uncommitted on `main`. **Commit that first** (handoff doc `docs/HANDOFF-calendar-composer-2026-07-16.md`) before starting marketing work, or it gets clobbered.
- **`main` auto-deploy is currently broken** (webhook) — deploy with `npx vercel deploy --prod --scope bradly413s-projects --yes`. Reconnect the GitHub→Vercel integration.
- **Do NOT re-add a foreign shell.** Build on Posterboy tokens only.
- Marketing uses Tailwind v4 + these CSS files (Posterboy, unlike TRC, is not "no-Tailwind") — fine to use utilities + the brand css.
- Keep route slugs (`/`, `/pricing`, `/privacy`, `/terms`, `/for/[slug]`, `/tools/what-to-post`) stable for SEO.

## Suggested first commit after the batch is committed
```
chore(marketing): extract Posterboy brand tokens, unify accent to #ee2532

Groundwork for the marketing rebuild: single posterboy-brand.css token
file; remove the leaked TRC accent #E1062C and duplicate ink value.
```
