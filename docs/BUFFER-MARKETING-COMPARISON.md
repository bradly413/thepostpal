# Buffer vs posterboy — marketing IA comparison

Reference: [buffer.com](https://buffer.com/) analysis (May 2026) vs current `MarketingSite` in this repo.

**Purpose:** Decide what to steal, adapt, or ignore while keeping posterboy’s editorial / approval-first positioning.

---

## Side-by-side map

| # | Buffer.com section | Job it does | posterboy equivalent | Steal / adapt / ignore |
|---|-------------------|-------------|----------------------|------------------------|
| 1 | **Global nav** — Product, Pricing, Resources, Login, Sign up | Orient + single signup path | `Navigation.tsx` — Why, How, Features, Founder, Pricing (anchor links only) | **Adapt** — add Sign in + primary CTA to `/sign-in`; keep editorial nav labels (not “Product”) |
| 2 | **Hero** — headline + email capture + platform tiles | Convert cold traffic | `Hero.tsx` — “Post like you [icon] like it.” + trial CTAs | **Keep posterboy** — stronger brand; **steal** tracked CTA params (`?cta=homepage-hero`) |
| 3 | **Social proof strip** — logos, “posts published last month”, platform count | Trust at a glance | *Missing* (carousel is problem-story, not proof) | **Steal (light)** — one quiet stats row: e.g. drafts approved / platforms / “built for realtors” |
| 4 | **Core features (4 pillars)** — Publish, Create, Community, Analyze | Explain product buckets | Split across `Solution`, `WordScroll`, `HolographicFeature` | **Adapt** — collapse to **3 pillars** aligned with product: **Draft → Press → Dispatch** |
| 5 | **More features grid** — collaborate, mobile, Start Page, AI | Upsell breadth | Partially in `HolographicFeature` + chat widget | **Ignore most** — posterboy wins on *less* surface area; mention AI only as “rewrite, don’t restart” |
| 6 | **Platform logos** — 10+ networks | Show integration coverage | *Missing* on homepage | **Steal (small)** — single row FB + IG (+ LinkedIn later); don’t hero 12 icons like Buffer |
| 7 | **Vertical tabs** — Creators / Small business / Agencies | Segment audiences | `/for/[slug]` routes exist; not on homepage | **Adapt** — one “For realtors” block or link to `/for/realtors`; skip agency tab until House Account |
| 8 | **Customer support** — human support, Discord, help center | Reduce signup friction | `ChatbotWidget` only | **Steal** — “Real humans” + link to help/email; skip Discord unless you want community |
| 9 | **Resources / SEO hub** — tools, glossary, blog | Organic growth engine | `/tools/what-to-post`, docs sparse | **Steal (later)** — 2–3 SEO pages max (“what to post”, “best time” for realtors) |
| 10 | **Open company / transparency** — MAU, customers, ARR, team size | Brand differentiation | `FounderCard` (personal, not metrics) | **Adapt** — optional “open metrics” when you have them; until then founder story > fake stats |
| 11 | **Pricing** — Free / Essentials / Team, per-channel calculator | Monetization clarity | `Pricing.tsx` — Good/Better/Best ($29/$59/$99) | **Keep posterboy tiers** on homepage; **steal** comparison table + FAQ from Buffer pricing page |
| 12 | **Final CTA band** — repeat signup | Catch scrollers | Hero CTAs + pricing CTAs | **Steal** — one closing band before footer with same copy as hero |
| 13 | **Footer** — legal, social, sitemap | Compliance + crawl | `Footer.tsx` | **Adapt** — ensure links to `/pricing`, `/sign-in`, `/for/realtors`, privacy |
| 14 | **Blog / Resources** (`/resources`) | Content marketing | Not wired to homepage | **Phase 2** — don’t clone Buffer’s volume; 1 editorial post/month is enough |

---

## Flow comparison

### Buffer (conversion-first SaaS)

```
Hero (email) → Proof stats → 4 features → More features → Platforms
  → Verticals → Support → Resources → Open metrics → Pricing → CTA
```

**Characteristics:** Short sections, scannable, repeated signup, data-driven trust, minimal scroll gimmicks.

### posterboy (editorial-first, Kimi design)

```
Hero (scroll animation) → Problem carousel → Manifesto → Solution flowchart
  → Word scroll → Holographic feature → Founder → Pricing → Footer
```

**Characteristics:** Long single page, GSAP storytelling, magazine tone, weaker conversion mechanics.

### Recommended hybrid (posterboy v2 homepage)

```
Nav (Sign in + Start trial)
→ Hero (brand + 1 CTA, lighter scroll)
→ Problem (1 section, not 10-image carousel)
→ 3 pillars: Draft / Press / Dispatch  ← maps to dashboard
→ Social proof (minimal stats or Angie quote)
→ Pricing teaser (3 cards, link to /pricing)
→ Founder / trust
→ Final CTA
→ Footer
```

**Move to `/pricing` or subpages:** long manifesto scroll, holographic demo, full feature matrix.

---

## Section-by-section: steal vs ignore

### Steal outright

| From Buffer | How to implement |
|-------------|------------------|
| **Marketing ≠ app URLs** | Already good: `/` marketing, `/sign-in` app. Mirror Buffer’s `login.buffer.com` pattern mentally — never mix auth into homepage bundle. |
| **CTA tracking query params** | `href="/sign-in?plan=good&cta=homepage-hero"` on all primary buttons; log in analytics later. |
| **Single primary action** | One red/ink button style site-wide: “Start your free trial” → `/sign-in`. Secondary: “See pricing”. |
| **Pricing FAQ + comparison table** | Add to `/pricing` (Buffer’s pricing page is their best IA page). Homepage keeps 3 cards only. |
| **Support block** | Small section: email support, “no bots” — matches posterboy voice. |
| **Platform row** | 3–5 icons under hero or pillars, not interactive tiles. |
| **Closing CTA band** | Duplicate hero CTA before footer. |
| **A/B testing hook** | When stable, one experiment: hero headline or CTA copy (Buffer validated hero for 2 weeks). |

### Adapt (posterboy flavor)

| From Buffer | posterboy twist |
|-------------|-----------------|
| **4 feature pillars** | Use **Draft / Press / Dispatch** (+ optional **Issues** for weekly bundle). Copy from `posterboy-copy.ts`. |
| **Open metrics** | When real: “X drafts approved this month” not ARR flex unless you want Buffer-style transparency. |
| **Vertical segments** | Lead with **realtors / local business** via `/for/realtors`, not creators/agencies. |
| **Resources hub** | “What to post in West County” > generic glossary. |
| **Email in hero** | Optional — Buffer captures email pre-signup; you can skip and go straight to `/sign-in` for lower friction early on. |
| **Design process** | Designer + engineer pairing in browser (their model fits your GSAP work; reduce Figma-only artifacts). |

### Ignore (wrong fit for posterboy)

| Buffer pattern | Why skip |
|----------------|----------|
| **Per-channel pricing calculator** | Your model is location/tier-based (Good/Better/Best), not Buffer’s channel math. |
| **Free forever tier marketing** | Growth plan uses Solo/Shop/Press; homepage Good/Better/Best is fine — don’t promise “free forever” unless product supports it. |
| **Community inbox / Analyze as hero pillars** | posterboy is approval-first, not engagement analytics suite. |
| **12-platform hero grid with cursor physics** | Pretty but “creator SaaS”; conflicts with calm editorial brand. |
| **Mixpanel + Metabase on homepage** | Overkill until you have real metrics pipeline. |
| **Heavy scroll animations on every section** | Keep 1 signature moment (hero); Buffer proves rest can be static. |
| **AI Assistant as headline feature** | Mention in Editor pillar only; not primary hook. |

---

## Nav & routing fixes (quick wins)

| Issue | Buffer does | posterboy should |
|-------|-------------|------------------|
| Login visible | Always in header | Add **Sign in** + **Start trial** to `Navigation.tsx` |
| Pricing | Dedicated `/pricing` + nav | Homepage `#pricing` + `/pricing` — **align tier names** (Good/Better/Best vs Solo/Shop/Press) |
| App entry | `login.buffer.com/signup?...` | `/sign-in` with same query param convention |
| Resources | Top-level nav | Defer; link “What to post” in footer when ready |

---

## Content mapping: Buffer pillars → posterboy product

| Buffer pillar | posterboy equivalent | Homepage copy angle |
|---------------|---------------------|---------------------|
| Publish | **Dispatch** | “Scheduled when you’re done approving.” |
| Create | **Drafts** + **Editor** | “Your week is drafted. You just Press.” |
| Community | *Ignore for v1* | Not competing on comment inbox |
| Analyze | **Analytics** (dashboard) | “You showed up this month. Reasonably.” |
| Team / Approvals | **Press** + **Issues** | “One tap. Whole week handled.” — **your moat vs Buffer Team tier** |

Lead with **approval workflow** in marketing; Buffer buries it in Team plan.

---

## Priority backlog (marketing site)

### P0 — Conversion (1–2 days)

- [ ] Nav: Sign in + Start trial
- [ ] CTA query params on all buttons
- [ ] Closing CTA section before footer
- [ ] Align `/pricing` with homepage tiers OR redirect one to the other

### P1 — IA simplification (2–3 days)

- [ ] Replace carousel with single “problem” section + 1 image
- [ ] Add 3-pillar section (Draft / Press / Dispatch)
- [ ] Trim or move manifesto + word scroll below fold / subpage
- [ ] Platform icon row (FB, IG)

### P2 — Trust & SEO (later)

- [ ] Support block
- [ ] `/for/realtors` promo strip on homepage
- [ ] Pricing FAQ (copy Buffer’s structure, posterboy voice)
- [ ] Optional stats when real data exists

### P3 — Engineering hygiene

- [ ] Remove `MarketingSiteHealthProbe` + `marketing-debug.ts` before prod
- [ ] Static assets on CDN path pattern (Buffer uses `static.buffer.com/marketing/`)
- [ ] GTM/analytics when ready (Buffer: GTM + Mixpanel + Clarity)

---

## One-line strategy

**Steal Buffer’s clarity and conversion mechanics; ignore their breadth and creator-energy UI. posterboy should feel like a magazine that ships your week — not a social command center.**

---

## Related docs

- `docs/posterboy-growth-plan.md` — tiers, product objects, activation metric
- `docs/brand-implementation-notes.md` — colors, type, voice
- `docs/CLAUDE-SESSION-HANDOFF.md` — current marketing implementation state
- `src/lib/posterboy-copy.ts` — canonical strings
