# UI Snippet Library

A curated, reusable library of animations and components — extracted from sites
Brad shares (via URL), converted to **Tailwind v4 + React** ready for this app,
and catalogued here so they can be pulled on demand.

> Retrieval: when Brad says e.g. _"add a border animation to this button"_, search
> this index by **category + tags** (`button` + `border`), open the snippet file,
> then adapt it to the target component and verify in preview.

## Conventions

- Each snippet lives under a category folder: `buttons/`, `cards/`, `loaders/`,
  `backgrounds/`, `text/`, `animations/`, `nav/`, `inputs/`, `misc/`.
- File is a self-contained React component (`.tsx`) using Tailwind v4 classes.
  Any keyframes/custom CSS it needs go in a colocated `<style>` block or a
  clearly-noted `globals.css` addition.
- Every snippet gets a row in the catalog below: **Name · Category · Tags ·
  File · Deps · Source**.
- Prefer Tailwind-native; pull in a dependency only when the effect genuinely
  needs JS (e.g. GSAP, framer-motion) — noted in **Deps**.
- Record the **Source URL** for licensing/attribution. Proprietary/paid-kit code
  is adapted (technique reused), not copied verbatim.

## Catalog

| Name | Category | Tags | File | Deps | Source |
|------|----------|------|------|------|--------|
| Animated Border Button | buttons | button, border, beam, conic, animation | `buttons/AnimatedBorderButton.tsx` | — | original |
| Shimmer Button | buttons | button, shine, sweep, animation | `buttons/ShimmerButton.tsx` | — | original |
| Gradient Border Button | buttons | button, border, gradient, hover | `buttons/GradientBorderButton.tsx` | — | original |
| Ripple Button | buttons | button, ripple, click, material | `buttons/RippleButton.tsx` | JS (no lib) | original |
| Hover Glow Button | buttons | button, glow, hover, blur | `buttons/HoverGlowButton.tsx` | — | original |
| Glass Button | buttons | button, glass, glassmorphism, neon, blur, shine, hover | `buttons/GlassButton.tsx` | — | adapted from user CodePen |
| Shimmer Skeleton | loaders | loader, skeleton, shimmer, loading | `loaders/ShimmerSkeleton.tsx` | — | original |
| Marquee | animations | marquee, scroll, infinite, logos | `animations/Marquee.tsx` | — | original |
| Gradient Text | text | text, gradient, animated, heading | `text/GradientText.tsx` | — | original |
| Tilt Card | cards | card, 3d, tilt, pointer, hover | `cards/TiltCard.tsx` | JS (no lib) | original |
| Animated Gradient Background | backgrounds | background, gradient, animated, hero | `backgrounds/AnimatedGradientBg.tsx` | — | original |
| Border Draw Box | borders | border, draw, trace, hover, 4-side | `borders/BorderDrawBox.tsx` | — | adapted from user CodePen |
| Rotating Gradient Border | borders | border, conic, radial, rotate, @property | `borders/RotatingGradientBorder.tsx` | — | adapted from user CodePen |
| Animated Post Frame | frames | frame, social, post, border, glow, rounded | `frames/AnimatedPostFrame.tsx` | — | original (combination) |
| Image Choice Cards | inputs | radio, picker, image, grayscale, reflection, select, onboarding | `inputs/ImageChoiceCards.tsx` | — | adapted from user CSS snippet (2026-06-11) |

_All seed snippets are authored from scratch (no third-party code) and use the
brand red `#ee2532` as the default accent. All respect `prefers-reduced-motion`._

## How entries get added

1. Brad shares a URL (live site / CodePen / component page).
2. Fetch it, isolate the animation/component CSS + JS.
3. Convert to a Tailwind v4 + React component under the right category folder.
4. Add a catalog row here with tags + source.
5. Snippet is now pullable in any future session by grepping this folder.
