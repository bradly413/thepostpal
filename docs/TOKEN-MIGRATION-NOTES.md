# Token migration notes

Hardcoded values in `src/components/dashboard/**` and `src/app/dashboard/**` that
do not map to motion/typography tokens within ~15%. Left intentionally unchanged.

## Motion

| Value | Context | Nearest token | Why kept |
|---|---|---|---|
| `150ms` / `.15s` | Legacy hover fades (shell, composer) | `--duration-fast` (120ms) | 25% off — kept where already migrated to `--transition-color` shorthands absorb fast timing |
| `140ms` / `.14s` | Menu row hovers | `--duration-fast` | 16.7% off |
| `160ms` / `.16s` | Intent icon press | `--duration-fast` | 33% off |
| `180ms` / `.18s` | Popover/tooltip fades | `--duration-standard` | 10% off — migrated |
| `220ms` / `.22s` | Intent icon color | `--duration-standard` | 10% off — migrated |
| `350ms` / `.35s` | Cover-flow card spring | `--duration-moderate` | 25% off |
| `450ms` / `.45s` | History gallery card move | `--duration-slow` | 12.5% off — migrated |
| `600ms` / `.6s` | SHG card transform | none | 50% off slow |
| `0.55s`–`0.85s` | Studio frame morph (GSAP-adjacent) | none | Choreography — see MOTION.md §3 |
| `cubic-bezier(0.65,0,0.35,1)` | Frame size morph | none | Layout choreography |
| `cubic-bezier(.34,1.56,.64,1)` | Home notif spring | `--ease-spring` | Exact match — migrated |

## Typography

| Value | Context | Nearest token | Why kept |
|---|---|---|---|
| `20px` | Shell logo wordmark | `--text-title` (17px) | 17.6% off |
| `30px` | AppSidebar logo | `--text-stat` (26px) | 15.4% off |
| `9px` | Chart axis labels | `--text-eyebrow` (10.5px) | 14.3% off — migrated in MetricBarChart |
| `9.5px` | Brand nav dots | `--text-eyebrow` | 9.5% off — migrated |
| `44px` | Week-saved stat (shell) | `--text-display` (34px) | 29% off |
| `clamp(...)` sizes | Brand book display | none | Marketing/display voice — not UI tokens |
| `letter-spacing: 0.6px` | AppSidebar nav (uppercase) | `--tracking-label` (0.1em) | px vs em — different unit |
| `letter-spacing: 0.08em` | Shell tags | `--tracking-label` (0.1em) | 20% off |
| `letter-spacing: 0.06em` | Studio AI tag | `--tracking-label` | 40% off |
| `letter-spacing: -.02em` | Shell logo/hero | `--tracking-tight` (-0.015em) | 25% off |
| `letter-spacing: -.01em` | Stat numerals | `--tracking-tight` | 33% off |
| `line-height: 1.4` | Shell base | `--leading-body` (1.65) | 15% off — borderline, kept on `.pb-dash` root |
| `line-height: 1.45` | Upgrade copy | `--leading-body` | 12% off — migrated |
| `line-height: 1.02` | Hero display | `--leading-tight` (1.1) | 7% off — migrated |

## Skipped files

- `PosterboyStudio.tsx` — owned by studio refactor task
- `studio/studio-styles.tsx` — migrated in studio refactor; GSAP-adjacent durations listed above
