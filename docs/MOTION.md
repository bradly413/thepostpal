# Motion System — Micro-Transition Stack

One motion vocabulary for **all surfaces** (marketing site, onboarding, dashboard).
Tokens live in `src/app/globals.css` `:root` and cascade everywhere — no imports needed.

## Tokens

| Easing | Value | Use for |
|---|---|---|
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | things appearing (menus, modals, toasts) |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | things leaving (faster, decisive) |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | color/border/shadow property changes |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | transforms with personality (lifts, knobs, checks) |

| Duration | Value | Use for |
|---|---|---|
| `--duration-micro` | 80ms | color/text changes |
| `--duration-fast` | 120ms | hovers, lifts, most interactions |
| `--duration-standard` | 200ms | menus, toggles, reveals |
| `--duration-moderate` | 280ms | modals, panels |
| `--duration-slow` | 400ms | large surfaces, page-level moves |

**Shorthands:** `--transition-color`, `--transition-shadow`, `--transition-lift`,
`--transition-opacity`, `--transition-enter`, `--transition-exit`, and
`--transition-interactive` (color + lift combined — the default for buttons/cards/chips).

## The interactive grammar

- **Hover** → `translateY(-1px)` (buttons/chips) or `-2/-3px` (cards) + shadow expand.
- **Active** → `translateY(+1/+2px)`, shadow collapses, `transition-duration: 60ms` (the snap).
- **Focus** → the existing 2px `#ee2532` ring (`globals.css :focus-visible`).
- **Enter/exit asymmetry** → things appear on `--ease-enter` at `--duration-standard`,
  leave on `--ease-exit` at `--duration-fast`. Leaving is always faster than arriving.
- **Tooltips/popovers** → 400ms intent delay before showing; no delay on hide.

## Rules

1. **Never hardcode a curve or ms value in new CSS** — compose from tokens. If a token
   doesn't fit, the design is probably over-animated.
2. `transition: all` is banned (it fights GSAP and animates layout properties).
   Name the properties or use a shorthand token.
3. GSAP work (hero glide, entrances) keeps its own easings — tokens govern CSS
   micro-interactions; GSAP governs choreography. Both must check reduced motion.
4. A global `prefers-reduced-motion` kill-switch at the bottom of `globals.css`
   zeroes ALL CSS transitions/animations. Per-component checks remain for JS motion.

## Already adopted

`.pb-btn-primary/secondary` (lift + 60ms press), `.pb-toggle` (spring knob), `.pb-tab`,
marketing `.neu-btn` (press snap), home shortcut/module cards, studio rail icons.
Legacy hardcoded transitions get migrated opportunistically — any file you touch,
convert what you touch.
