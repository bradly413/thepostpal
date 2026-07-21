# Homepage redesign v2 — "The Calm Demo"

2026-07-21 · Brad's direction: *simple, modern, clean, smart; too many choices in the hero;
remove hero images; redo Studio-to-Post, Say-It, and the comparison; complete overhaul —
like professional website designers built it.*

---

## 1 · Critique of the current build (why it feels like "too much")

**First impression (2 seconds).** Nothing owns the eye. The hero splits attention nine ways:
headline, sub, six category chips in a ragged 3+3 wrap, a text input, a red button, two text
links, a five-link trust row, and seven floating photos. A visitor's first job is *choosing*,
and we gave them a bureaucracy.

**The orbit field reads as clip-art.** HVAC van, dental chair, donut, dealership, scrubs team —
individually fine, collectively random. There's no compositional logic (no grid, no size rhythm,
no narrative), so it reads as decoration, not product. Professional sites earn imagery; this
spends it.

**Every section is loud in the same way.** Ten sections, each with kicker + big h2 + red accent +
cards. Red appears ~20 times per page (kickers, numbers, tags, payoffs, buttons) — when
everything is an accent, nothing is. Card chrome everywhere (chips, pills, bordered rows,
shadowed panels) adds visual mass without meaning.

**Motion competes with reading.** A marquee, a typewriter, a pinned scroll-hijacked walkthrough,
staggered rows, animated bars. Four motion systems on one page. The pinned scrub section is the
single biggest "hard to follow" offender — it takes the scrollbar hostage for 220vh.

**What already works (keep):** the voice, the warm-paper + red palette, the live demo concept,
the real product screenshots, the dry FAQ, verified pricing, the honesty labels.

---

## 2 · Design direction — one idea per viewport

**Concept: The Calm Demo.** The product's promise is calm; the page must *be* calm.
Editorial-minimal, type-led, Linear/Stripe-tier restraint with Posterboy's dry wit.
The only pictures on the page live inside product frames — the UI is the imagery.

### System rules (the design system)

| Rule | Spec |
|---|---|
| Type scale | Display: Instrument Sans 600/700, clamp(52px→92px), tracking −0.04em, 1.0 line-height. Body 16–18px/1.6. Micro-labels 11px/0.18em uppercase — used at most once per section. Serif stays logo-only. |
| One-red rule | Exactly **one** red element per viewport: the primary CTA *or* a payoff word — never both, never kickers + numbers + tags. Everything else is ink (#141418) on paper (#f7f4ee) with a 60% ink for secondary. |
| Containers | Kill card-mania. Default = open composition on paper with 1px ink/8 hairline dividers. Boxes are reserved for **product artifacts** (the demo result, the Studio frame, pricing) and get the nested treatment: outer shell `ink/4` + hairline + p-1.5 + r-24, inner surface white + concentric r-[calc]. Nothing else gets a border. |
| Space | Sections py-120→170. Content max-w 1080. Asymmetric 12-col placements (headline cols 1–7, artifact cols 8–12 style) instead of centered-everything. |
| Motion | ONE system: fade-up 16px + 0.6s power2.out, staggered 80ms, on enter, reverse on full exit. Typewriter allowed only inside the Studio artifact. **No marquee. No pinning. No scrub. Anywhere.** Reduced motion: instant. |
| Buttons | Full-round pills, 52px height, red bg; secondary = text-only with underline offset. Active scale .98. |
| Nav | Slim to: How it works · Pricing · Sign in · **Start free trial**. Drop Compare/Results from the nav — the page carries them. |

### Page architecture — 10 sections → 7

Cut: the proof-strip marquee (noise; its honesty line moves into the demo result) and the
tabbed case studies (three dense panels; its one useful idea — 1→4 posts a week — becomes a
single line inside the new comparison). Everything else gets rebuilt to the system:

1 Hero demo · 2 Studio artifact · 3 How it works · 4 The honest comparison ·
5 What we handle · 6 Pricing · 7 FAQ → footer CTA → footer.

---

## 3 · Section plans

### 3.1 Hero — one sentence, one choice, zero images
Remove the orbit entirely. Remove the business-name input. Remove the trust-link row.
Collapse six chips into **one control embedded in a sentence** (the mad-libs pattern):

> **You run the place.**
> **We'll run the feed.**
>
> I run a **[corner café ▾]** → `Show me my feed`

- The select is styled as an underlined red-caret phrase inside the sentence — one choice,
  six options, zero visual weight. (Native `<select>` under the hood: accessible, mobile-free.)
- Sub keeps the mandated line: "Tell us what you do. Watch three posts write themselves."
- Below the button, one quiet reassurance line: "Free to start. No credit card."
- **Result state:** the sentence row stays; three **typographic post cards** (day · time chip +
  caption, no photos) cascade in below in a single column, nested-frame treatment, first caption
  typed. Fallback + "example week" label behave exactly as today. Button states unchanged
  ("Show me my feed" → "Writing your posts..." → "Try another business type.").
- Layout: left-aligned on the 12-col grid, cols 1–8; right side is *empty paper* — the
  whitespace IS the design. Idle state: nothing cycles. Calm.

### 3.2 Studio artifact — one frame, whole story ("From studio to post")
Replace the two-cards-and-arrow diagram with **one product frame** that assembles a post in
four beats inside itself:

1. prompt line types: `brunch spread, soft morning light, top-down`
2. the image develops in-frame (cover wipe, blur→sharp)
3. the caption writes itself beneath the image
4. a small stamp lands: `Scheduled · Sat 8:00 AM ✓`

One artifact = input → image → caption → scheduled. That's the entire product in one object.
- Copy (old headline referenced the deleted orbit): eyebrow `Posterboy Studio` ·
  H2 **"One sentence in. One post out."** · sub: "Studio makes the image. The caption writer
  matches your voice. Schedule stamps it. You never opened Canva."
- The image strip below is cut. This is the only photographic moment on the page, and it's
  inside UI chrome — earned, not decorative.

### 3.3 How it works — unpinned, monumental, quiet
Kill the pin/scrub/arrows/counter entirely. The five steps (names + descriptions preserved
verbatim) become a **single vertical numbered list**, editorial style:

- Oversized ghost numerals (01–05, ink/10) left; step title 28–32px + one-line desc right;
  hairline between rows; simple stagger on enter.
- One real product screenshot sits sticky-adjacent on the right column desktop-only
  (the Schedule page shot — our best UI), swapping is *not* required; static is calmer.
  Mobile: pure list, no imagery.
- Headline stays **"Say it. It's made."** — it earns its place better above a calm list than a
  scroll-jack.

### 3.4 The honest comparison — the strike-through
Redo as a single typographic moment, no cards, no long paragraphs:

> THE HONEST COMPARISON
> ~~Do it yourself~~ — $30/mo and every Sunday night.
> ~~Hire an agency~~ — $1,500/mo and a meeting about the meeting.
> ~~Go quiet~~ — free, until customers think you closed.
> **posterboy** — $99/mo. Writes, schedules, publishes in your voice. **No Sunday nights.**
> `Start free trial`

- Three struck-through options with one dry clause each; the fourth line is the only red-accent
  moment in the viewport + the section's single CTA.
- One supporting line beneath (absorbing the case-study idea, honesty label kept):
  "The difference in practice: one post most weeks → four that sound like you. Illustrative,
  not a customer claim."

### 3.5 What we handle — keep, promote
Already the most "professional" section. Keep the 10 tags verbatim, scale them up
(clamp 24→40px), tighten to 3 lines, payoff "your peace of mind." stays the section's one red.

### 3.6 Pricing — same bones, new skin
Keep verified math, toggle, plan/billing preservation, sales-assisted Command, BRC footnote.
Restyle: nested-frame cards, hairline borders (no drop shadows), anchor line
"Less than one Sunday night, every month." as the sub, toggle as a minimal segmented control.

### 3.7 FAQ + footer CTA — restyle only
FAQ: hairline dividers, larger question type, same 8 questions/single-open. Footer CTA keeps
the shared demo ("Still scrolling? Show us your business.") restyled to the ink band with the
select-in-sentence control; footer unchanged.

---

## 4 · Build order (each step previewable, ~1 commit each)

1. **Tokens + shells**: type scale, one-red sweep (strip red kickers page-wide), section
   scaffolding, nav slim-down. Delete ProofStrip + CaseStudies from the page.
2. **Hero v2**: select-in-sentence, no images, typographic results. (Reuses `useFeedDemo`,
   `demo-feed.ts` untouched.)
3. **Studio artifact** rebuild.
4. **How-it-works** unpinned list.
5. **Comparison** strike-through + WWH scale-up.
6. **Pricing/FAQ/footer** reskin.
7. Verification pass (tsc/lint/tests/build + browser sweep) → commit → real-Chrome check.

Estimated diff: ~6 components rewritten, 2 deleted, 0 new dependencies, no API changes.

## 5 · What this deletes (so nothing is silently lost)

- Orbit tiles, marquee, pinned scrub, tabbed case studies, animated chart bars, trust-link row,
  business-name input, hero photography. The `demo-feed` data, engine hook, analytics events,
  pricing math, FAQ content, and all honesty labels survive unchanged.
