# Typography System

The type half of the design-token system (motion lives in `docs/MOTION.md`).
Tokens + utilities live in `src/app/globals.css` and cascade to **all surfaces**
(marketing, onboarding, dashboard).

## Voice split (unchanged, now enforced by tokens)

- **Serif** (`var(--font-serif)` / Playfair / Instrument) — the `posterboy®` logo and
  marketing display headings (`.type-display`, `.type-h2`) ONLY. Never on app UI.
- **Sans** (SF Pro / Inter stack) — everything interactive.
- **Mono** (`--font-mono`, system mono stack — no webfont download) — numerals,
  dimensions, timestamps. Pair with `font-variant-numeric: tabular-nums`.

## Scale

| Token | Size | Role |
|---|---|---|
| `--text-eyebrow` | 10.5px | uppercase eyebrows, module labels |
| `--text-label` | 11px | form labels, uppercase metadata |
| `--text-caption` | 12.5px | secondary captions |
| `--text-body-sm` | 13px | card/body copy, buttons |
| `--text-body` | 14px | inputs, default copy |
| `--text-ui` | 15.5px | the composer / primary inputs |
| `--text-title` | 17px | card + panel titles |
| `--text-heading` | 24px | section headings |
| `--text-stat` | 26px | stat numerals (LIGHT weight) |
| `--text-display` | 34px | page titles (LIGHT weight) |

**Tracking:** `--tracking-eyebrow` 0.14em · `--tracking-section` 0.16em ·
`--tracking-label` 0.1em · `--tracking-tight` −0.015em · `--tracking-display` −0.04em.
**Leading:** tight 1.1 · snug 1.3 · body 1.65.

## The signature moves

1. **Light display** — big text gets LIGHTER, not bolder: page titles and stat
   numerals are weight 300 with `--tracking-display`; emphasis inside them uses
   `<strong>` (600). (`.pb-app-header h1`, `.bignum`, `.audstats b`.)
2. **The eyebrow** — 10.5px / 600–700 / 0.14em / uppercase / muted ink. Module
   headers on Home use this now (`.mtitle2`).
3. **The hairline section label** — `.t-section-label`: tiny tracked uppercase +
   a hairline that runs to the edge. Use for grouping content sections.
4. **Mono for numbers** — `.t-mono` for dimensions (1080×1350), times, counts.

## Utilities

`.t-eyebrow` `.t-section-label` `.t-label` `.t-title` `.t-body` `.t-caption`
`.t-stat` `.t-mono` — color is inherited; pair with your surface's ink vars.

## Rules

1. New text styles compose from tokens — no ad-hoc px/tracking values.
2. Don't add weights above 700 anywhere; hierarchy comes from size + tracking +
   case, not heaviness.
3. Uppercase always gets positive tracking (≥0.1em); display sizes always get
   negative tracking.
4. Migrate-what-you-touch, same as motion.
