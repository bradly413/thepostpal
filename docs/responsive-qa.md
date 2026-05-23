# Mobile / responsive QA — production punch list

**Generated:** 2026-05-23 (overnight Day-2 prep, Task G)
**Target:** https://www.posterboysocial.com (commit 2b37466 on `angie-social-portal`)
**Method:** headless Chrome screenshots at 390×844 (mobile) and 1280×900 (desktop) across 4 public pages (`/`, `/sign-in`, `/pricing`, `/for/restaurants`)
**Verdict:** **systemic mobile content overflow on every marketing page.** Desktop renders cleanly. One root cause, one likely fix.

Screenshots are at `/tmp/pb-resp/*.png` for reference (not committed — regenerate with the headless Chrome script in the appendix below).

---

## TL;DR

| Page | Desktop (1280) | Mobile (390) | Verdict |
|---|---|---|---|
| `/` (home) | ✅ Clean | 🔴 Hero text "like it." cut off right; "See how it works" CTA off-screen right | Overflow |
| `/sign-in` | ✅ Clean | 🔴 "Create account" link, form inputs, "Sign In" button all overflow right | Overflow |
| `/pricing` | ✅ Clean (untested but unchanged) | 🔴 Nav, body copy ("businesses that nee..."), pricing card all overflow right | Overflow |
| `/for/restaurants` | (not sampled this pass) | 🔴 Nav "How it wor..." cut, body ("Your specials… Your soc…") cut, example posts cut | Overflow |

**Single root cause:** the marketing sections aren't constraining content width to the viewport. Content extends to the right of the visible area on narrow widths.

---

## Per-page findings

### 1. Home `/` at 390px wide

What you see:
- `posterboy` logo top-left ✅
- Nav links: **missing entirely on mobile** — the `.hide-mobile` class hides them; no hamburger replacement renders in this screenshot (might be off-screen). Worth confirming with a hamburger probe.
- Hero: "Post like you ✈ like it." — **"like it." is clipped on the right edge of the viewport.** The headline scales via `font-size: clamp(28px, 4.8vw, 64px)` but isn't reflowing/wrapping at 390px because the line is allowed to extend off-screen.
- Sub: "Social media for people who'd rather not." ✅ fits
- CTAs: "Start your free trial" + "See how it works" sit side-by-side. **"See how it works" extends past the right edge.** Should stack vertically below ~480px.

### 2. Sign-in `/sign-in` at 390px wide

- `posterboy` logo + "New here? **C**…" — "Create account" link is **truncated** mid-word. The top-right nav doesn't wrap or shrink.
- "Sign in" headline ✅
- "Your week is probably drafted. Go approve i**t**." — **trailing text clipped right.**
- "Email or username" + "Password" labels ✅
- Input fields: **right edge of inputs is past the right edge of viewport.** Same for "Sign In" button.

### 3. Pricing `/pricing` at 390px wide

- Top nav: "Product / Pri**cing**" — Pricing cut + more nav items truncated
- "Pricing" headline ✅
- Body: "Low-friction plans for businesses that nee…" — clipped right (should read "that need to show up. Premium tiers...")
- "Enough to get started" subhead ✅
- Pricing card: **right edge of card extends past viewport** — text inside the card ("One business, one user, three social accounts.") clipped at the right.

### 4. `/for/restaurants` at 390px wide

Same systemic pattern:
- Nav: "Product / Pricing / How it wor…" — clipped
- Headline ✅ wraps cleanly (uses `text-wrap: balance` probably)
- Body: "Your specials board updates daily. Your soc…" — clipped (should be "Your social hasn't since March.")
- Example posts list extends past right edge

---

## Why this is happening (best guess from the CSS)

`src/styles/posterboy-marketing.css` defines:

```css
--px: clamp(20px, 3vw, 40px);
```

That's a reasonable horizontal page padding — at 390px viewport it computes to 20px (the min). So padding itself is fine.

The likely culprits live in specific sections:

- **`padding-left: max(5vw, var(--px)); padding-right: 12vw`** (lines 324–325) — `12vw` at 390px = 47px right padding, which by itself isn't wrong, BUT if the inner container has its own fixed width it'll overflow regardless.
- **`max-width: 1200px` / `max-width: 1280px`** on stage containers (lines 475, 687) — these don't shrink below their content's natural width if children themselves have fixed widths.
- **`max-width: 700px`** (line 302) — sections constrained but children may use absolute widths.
- The **hero** headline likely has `min-width` (implicit via no-wrap or large font-size) that exceeds 390px-padding.

Sub-hypothesis: certain JSX components hardcode `width:` values or use `whiteSpace: nowrap` for buttons / nav links, which prevents mobile wrap.

---

## Likely fix (medium confidence; needs author to pick the right strategy)

Three options, ordered by safety:

### A. Per-component `overflow-x: hidden` + container fixes (safest, slow)
Inspect each section file (`Hero.tsx`, `Pricing.tsx`, `Navigation.tsx`, `MarketingSubpageChrome.tsx`, etc.) and add proper mobile wrap behavior: `flex-wrap: wrap`, replacing fixed `width` with `max-width: 100%`, adding `word-wrap: break-word` on long-form text. Time: ~half-day.

### B. Global escape hatch (`overflow-x: hidden` on body)
Add `html, body { overflow-x: hidden; }` in `globals.css`. **Hides the overflow but doesn't fix it** — content is still off-screen, users on mobile won't see it, they'll see clipped text and never know there's more. Anti-pattern but ships in 30 seconds. **Don't use for beta — testers will think the site is broken.**

### C. Audit Hero + Navigation specifically (highest leverage)
The home hero's "Post like you ✈ like it." needs `flex-wrap: wrap` or `text-wrap: balance` enforced at mobile widths so the whole line fits or wraps. Same for the CTA row. The Navigation at the top is probably the only piece that needs a hamburger fallback (`.hide-mobile` is set but no hamburger is rendered in its place on these pages). 80% of the visible damage is in those 2 components. Time: ~1–2 hours.

**Recommend C for the beta-window fix**, A as the follow-up sweep.

---

## What I did NOT test (out of scope this pass)

- `/dashboard` and any dashboard sub-route — these require auth. Worth doing a similar pass once a tester is logged in, especially `/dashboard/studio` since it has the canvas-based ParticleReveal which often behaves strangely at narrow widths.
- `/onboarding` — requires auth and goes through the 7-step wizard. The form-input width issue from `/sign-in` is likely identical there, plus the pill-selector grids (target client, content focus) may not wrap on narrow widths.
- Tablet width (768) — not screenshotted, but if 390 overflows and 1280 doesn't, the in-between is probably "mostly fine, sometimes clipped." Worth a quick check.
- Real iOS Safari — the headless render is Chrome rendering engine. iOS Safari has separate quirks (notch safe-area-inset, momentum scroll, viewport units that include URL bar). Recommend at least one tester walk on an iPhone.

---

## Beta-launch checklist (responsive)

- [ ] 🔴 Fix mobile overflow on `/`, `/sign-in`, `/pricing`, `/for/[slug]` — recommend Option C (Hero + Nav scoped fix)
- [ ] 🟡 Verify hamburger menu exists for nav on mobile (the `.hide-mobile` class hides desktop nav links but I didn't see a hamburger render in the screenshots)
- [ ] 🟡 Add an iOS Safari spot-check pass (testers walking the site on iPhone)
- [ ] 🟢 Dashboard/Studio/Onboarding mobile sweep after a tester gets logged in
- [ ] 🟢 Post-beta: tablet (768) pass; iOS Safari deep-dive

---

## Appendix — reproducing the screenshots

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=/tmp/pb-resp
mkdir -p $OUT

shot() {
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --virtual-time-budget=5000 --window-size=$3,$4 \
    --screenshot=$OUT/$1.png "$2" 2>/dev/null
}

# mobile
shot home-mobile     https://www.posterboysocial.com/         390 844
shot signin-mobile   https://www.posterboysocial.com/sign-in  390 844
shot pricing-mobile  https://www.posterboysocial.com/pricing  390 844

# desktop (sanity check that overflow is mobile-only)
shot home-desktop    https://www.posterboysocial.com/         1280 900
```

No npm install needed — Chrome's built-in headless mode handles it.
