# Claude update — Posterboy landing page mobile completion pass

**Date:** 2026-06-02  
**Repo:** `~/Desktop/ventures/thepostpal/`  
**Branch:** `main` with local uncommitted marketing changes  
**Local preview:** `npm run dev -- --webpack` → `http://127.0.0.1:8240/`

Paste the **Context prompt** section into a new Claude Code thread if you want it to continue from this exact landing-page state.

---

## Context prompt (paste below)

You are continuing work on **Posterboy Social** in:

```bash
cd ~/Desktop/ventures/thepostpal
```

Use the local preview at:

```bash
npm run dev -- --webpack
# http://127.0.0.1:8240/
```

This update is only about the **marketing landing page mobile completion pass** that happened on **June 2, 2026**. It does not replace the broader repo handoffs in `docs/CODEX-HANDOFF.md` and `docs/CLAUDE-UPDATE-2026-05-22.md`; it layers on top of them.

### What changed

Five files were updated:

- `src/components/marketing/sections/Hero.tsx`
- `src/styles/posterboy-marketing.css`
- `src/components/marketing/sections/BuiltForStrip.tsx`
- `src/lib/marketing-images.ts`
- `src/components/marketing/sections/CarouselSection.tsx`

### 1. Hero mobile layout was rebuilt

The desktop GSAP headline composition was not working well on phones, so mobile now uses a dedicated lockup instead of trying to compress the desktop animation.

Current mobile hero behavior:

- H1 is back to: **"Post like you like it."**
- Supporting line now reads: **"Posterboy creates, schedules, and publishes so your business stays active without becoming your second job."**
- Primary CTA now says: **"Build your brand book"**
- Secondary CTA now says: **"See the workflow"**
- The mobile hero renders its icon, kicker, H1, supporting copy, and buttons immediately in the first viewport
- On `max-width: 640px`, the desktop animated headline is hidden and the dedicated mobile stack is shown instead

Important implementation detail in `Hero.tsx`:

- GSAP now short-circuits on mobile with `matchMedia("(max-width: 640px)")`
- On mobile, it sets `.hero-mobile-lockup`, `.hero-sub`, and `.hero-cta` visible immediately instead of waiting on the desktop timeline
- Reduced-motion mode also explicitly reveals the mobile lockup

Important CSS in `posterboy-marketing.css`:

- `.hero-mobile-lockup`, `.hero-mobile-mark`, `.hero-mobile-kicker`, `.hero-mobile-title`
- mobile `@media (max-width: 640px)` rules for:
  - `.hero-flip`
  - `.hero-pin`
  - `.hero-copy`
  - `.hero-headline`
  - `.hero-sub`
  - `.hero-cta`
  - `.neu-btn`

### 2. Built For mobile section was fixed

The previous wrapped-pill treatment broke badly on phone width and collapsed into an unreadable pile of labels.

Current behavior:

- desktop marquee stays in place
- mobile now uses a dedicated 2-column grid
- labels were shortened for narrow screens:
  - `Community banks`
  - `HVAC & trades`
  - `Local services`
  - `Multi-location`
  - etc.

Implementation in `BuiltForStrip.tsx`:

- added `MOBILE_LABELS`
- kept desktop marquee as `.pb-builtfor-marquee hide-mobile`
- added separate mobile container: `.pb-builtfor-grid`
- mobile items render as `.pb-builtfor-chip`
- component-local CSS under `@media (max-width: 768px)` switches the grid on and gives the cards stable sizing

### 3. The problem section was rebuilt for mobile

The old sticky / pinned behavior created a giant blank section on phones. That is gone.

Current behavior in `CarouselSection.tsx`:

- desktop still uses the animated scrubbed carousel treatment
- mobile no longer pins the section
- on compact viewports, the problem section becomes a normal horizontal swipe row
- section blank space is removed by forcing `section.style.minHeight = "0px"` and exiting before the pinned ScrollTrigger path runs

This directly fixed the browser issue where the selected `#problem` section had a huge empty blue-highlighted region on mobile.

### 4. Carousel content is stronger and less placeholder-heavy

The old carousel was mostly an image strip with numbers. It now carries actual problem-language inside each card.

Current card structure:

- `kicker`
- `title`
- `body`

Examples:

- `"The post exists. It just never leaves your camera roll."`
- `"You remember social only after the week is already full."`
- `"The generic caption is worse than saying nothing."`

Visual treatment changes:

- removed the old blur-heavy glass layer
- added `.carousel-card-overlay`
- added `.carousel-card-copy`, `.carousel-card-kicker`, `.carousel-card-title`, `.carousel-card-body`
- mobile card sizing and spacing were tuned in CSS

### 5. Carousel image sources now use real repo assets

`src/lib/marketing-images.ts` no longer points the carousel at the placeholder-style mixed set. It now uses:

```ts
/images/social-mocks/01.png
/images/social-mocks/02.png
...
/images/social-mocks/10.png
```

These are still mock assets, but they read more like real product/brand imagery than the old placeholder mix.

### Verification already done

The local preview was checked in-browser at `http://127.0.0.1:8240/` in a phone-width viewport.

Verified outcomes:

- the hero shows H1 + supporting copy + CTA in the first mobile viewport
- the `Built for` section no longer breaks into overlapping wrapped pills
- the `Problem` section no longer reserves a huge blank pinned area on mobile
- the carousel reads as a swipeable card rail on phone width
- page-level horizontal overflow was removed during the mobile hero pass

### Next best steps

If you continue from here, do this order:

1. Tighten pricing section mobile spacing and card rhythm
2. Clean footer spacing / copy density on mobile
3. Run a full top-to-bottom mobile QA pass on `/`
4. Only after that, decide whether lower-funnel copy needs another compression pass

### Files to inspect first

- `src/components/marketing/sections/Hero.tsx`
- `src/components/marketing/sections/BuiltForStrip.tsx`
- `src/components/marketing/sections/CarouselSection.tsx`
- `src/lib/marketing-images.ts`
- `src/styles/posterboy-marketing.css`

### Important caution

Do not revert the mobile short-circuit in the hero GSAP logic unless you replace it with another mobile-specific render path. The current behavior intentionally avoids forcing the desktop animated composition onto phones.

Do not reintroduce pinned / sticky ScrollTrigger behavior for the mobile `Problem` section unless you explicitly prove it does not recreate the blank-space issue.

---

## Short summary

This pass was a **mobile landing-page cleanup**, not a full marketing redesign.

The biggest fixes were:

- hero is now usable on phone width
- `Built for` no longer breaks on mobile
- `Problem` no longer creates giant blank space on mobile
- carousel cards now have real copy and better assets

The remaining work is lower on the page: pricing, footer, and one final mobile QA sweep.
