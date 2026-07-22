# Dashboard redesign plan — smartest Posterboy

**Date:** 2026-07-21  
**Figma:** https://www.figma.com/design/7H6gH2eAlLYbJjYgz6vCk0/Untitled?node-id=9-3776  
**Local design source of truth (until Figma is shared):** `~/Downloads/posterboy-dashboard-design.md` + `~/Downloads/posterboy-dashboard.html`

---

## Product north star

Posterboy is the **anti–social-media-management dashboard**.

```text
Create a post → choose where it goes → schedule or publish → done
```

The home screen should answer in **under five seconds**:

1. What should I do next?
2. What’s going out next?
3. How do I make something?

No feeds, engagement charts, ad centers, or “issues/overdue” energy on home.

---

## Design system (from mock / brief)

| Token | Value |
|-------|--------|
| Warm paper | `#F4F1EC` / `#F7F4EF` |
| Card | `#FFFFFF` |
| Ink | `#0E0E0F` |
| Muted | `#6F6A64` |
| Line | `#E8E2DA` |
| Press red | `#EF2B24` / existing `#ee2532` |
| Radius | `20–28px` (2xl–3xl) |
| Shadows | Soft, visible — not washed frosted-only |

**Layout:** three columns — `Sidebar | Main | Right rail`

**Typography:** strong black sans for UI; serif **logo-only** (keep Instrument Serif on `posterboy`).

Preserve Posterboy warm-light identity; tighten toward the brief’s bolder white cards + clearer red accents (less washed glass).

---

## Information architecture (target)

### Primary nav (match Figma mock)

```text
Dashboard
Create
Schedule
Library
────────
Support
Settings
```

No **Brand**, **Editor**, or **Templates** in the nav. Those become **modes and sheets**, not destinations.

+ search / notifications / profile in the top bar (per mock)  
+ big red **Create post** / **New post** as the primary action (sidebar or hero)  
+ business switcher near profile

### What happens to Editor, Templates, Brand

| Old page | New home | Why |
|----------|----------|-----|
| **Brand** `/dashboard/brand` | **Context, not a page** — Home “Brand voice” card → slide-over; Settings → Brand voice; Create shows a persistent “Sounds like you” chip that opens the same sheet | Voice steers captions/Studio; users don’t “go manage a brand book” |
| **Templates** `/dashboard/templates` | **Start option inside Create** + **Library filter** (“Templates”) | Templates are starting points for posts, not a product section |
| **Editor** `/dashboard/editor` | **Create canvas mode** — open from Create / template pick / “Edit post”; deep link `/create?mode=editor&template=…` if needed | Editing is part of making a post, not browsing |

**Create** owns the whole make loop:

```text
Create
  → Blank post | From template | From Library asset | Open Studio
  → Compose / edit (caption + media + optional template canvas)
  → Channels → Time → Schedule | Publish
```

**Library** owns reusable stuff:

```text
Library tabs: Photos · Posts · Templates · Saved
Primary action on any row: Use in a post → jumps into Create prefilled
```

**Settings** owns configuration:

```text
Business · Social accounts · Brand voice · Team · Billing · Analytics · Support
```

Brand’s heavy editorial book (palettes, lockups, collateral) can stay as an advanced Settings sub-view or a rare “Open brand kit” link — not primary nav.

### Map from today → target

| Today | Target | Notes |
|-------|--------|--------|
| Home `/dashboard` | **Dashboard** | Mock layout: stats strip optional/light; prefer brief’s calm hero if we cut engagement noise |
| Studio | Mode under **Create** (“Open Studio”) | Keep `/dashboard/studio` route; remove from primary nav or nest under Create |
| Calendar | **Schedule** | Rename |
| Drafts | Schedule filters + Library “Posts” | No drafts pile on home |
| Photos | **Library → Photos** | |
| Templates | Create “From template” + Library tab | Deprecate standalone nav |
| Editor | Create edit mode | Deprecate standalone nav |
| Brand book | Sheet + Settings | Deprecate standalone nav |
| Ads / Channels | Settings or Command-only | Off Solo primary nav |

### Tension to resolve (mock vs product brief)

The attached Figma home shows **engagement stats** (likes, followers, clicks, announcements feed). The written product brief says **anti-suite / no engagement on home**.

**Recommendation for “smartest” Posterboy:** keep the Figma **chrome + IA** (sidebar, Create/Schedule/Library), but replace the engagement widgets with the brief’s calm loop (Next up, todos, Recently posted, Brand voice, Studio). Optionally keep one soft number (posts scheduled this week) — not likes/comments.

### Mobile

`Create · Schedule · Library · More`  
More: Settings, Support, gated Command items. No Brand/Editor/Templates tabs.

---

## “Smartest” product layer (beyond the mock)

The mock is the **calm shell**. Smartness is **context-aware next actions**, not more panels.

### 1. Living to-do list (hero)

Generate 0–3 todos from live tenant state — never static filler.

| Signal | Todo |
|--------|------|
| No approved/scheduled posts in next 7 days | Create a post for this week |
| Next scheduled post exists | Review your next scheduled post |
| Voice thin / never completed Brand | Update your brand voice |
| Meta disconnected | Connect Facebook & Instagram (soft) |
| Failed publish | Fix a post that didn’t go out (rare; calm copy) |

Empty state when healthy: **Everything in sync** + “Nothing else needed.”

### 2. One create spine

One **New post** entry that routes by intent:

```text
New post
  → What are you sharing? (Photo / Update / Offer / Event / Hours / Other)
  → Studio (if visual) OR composer (if caption-first)
  → Channels
  → Time
  → Schedule | Publish
```

Studio remains the creative canvas; Calendar composer remains the publish path. Smart = shared handoff (`schedule-handoff` already exists) + single CTA language.

### 3. Voice everywhere (no Brand page)

- Home Brand Voice card → **sheet** to tweak tone / never-say / samples.
- Create chrome: chip “Sounds like {business}” → same sheet.
- Settings → Brand voice for deeper edits / learn-from-docs.
- Onboarding Voice Architect lands into Dashboard with voice already set — Brand page is not the destination.

### 4. Templates as starters, not a section

- Create step: **Blank · Template · Library · Studio**.
- Library → Templates grid with **Use in a post**.
- No `/dashboard/templates` in nav (keep route as redirect into Create/Library for bookmarks).

### 5. Editor as Create mode

- Template canvas and caption composer are both **Create**.
- Deep links: `/dashboard/create?templateId=` or reuse studio/composer routes under a Create layout shell.
- “Edit” from Schedule/Library opens Create prefilled — never navigates to an Editor hub.

### 4. Next up as the only “status” that matters

Right rail **Next up** = next `approved`/`scheduled` post with thumbnail, time, **View schedule**.  
Optional: soft weekly rhythm (“2 published · 1 scheduled”) — **no** engagement graphs.

### 5. Time saved (encouraging metric)

Simple computation from posts created/scheduled this week × assumed minutes saved — large number, red `h`, no chart. Encouragement, not reporting.

### 6. Recently posted → Use again

Reuse loop: thumbnail + title + date + **Use again** → prefill composer/Studio. No likes/reach.

---

## Home composition (match brief)

```text
┌──────────┬────────────────────────────┬─────────────┐
│ Sidebar  │ Hero (Welcome / todos /    │ Next up     │
│ Create…  │ CTAs / subtle carousel)    │ Time saved  │
│ New post │────────────────────────────│ (optional   │
│          │ Recently │ Brand │ Studio  │  This week) │
└──────────┴────────────────────────────┴─────────────┘
```

**Components to build**

- `DashboardSidebar` (new slim IA; may replace/extend `AppSidebar`)
- `HeroWelcomeCard` (+ `TodoRow`, optional carousel slides)
- `NextUpCard`
- `TimeSavedCard`
- `RecentlyPostedCard`
- `BrandVoiceCard`
- `StudioCard`
- Shared `PrimaryButton` / `SecondaryButton` matching brief

---

## Implementation phases

### Phase 0 — Align on source of truth (½ day)

- [ ] Confirm Figma node `9-3776` matches local brief (export that frame if access needed).
- [ ] Decide Solo vs Command: Ads/Channels stay gated off primary nav.
- [ ] Freeze rename: Calendar → Schedule, Photos+Drafts → Library.

### Phase 1 — Frame + tokens (1–2 days)

- [ ] New 3-column home shell under `DashboardShell` (or home-only layout).
- [ ] Token pass: paper bg, white cards, stronger red, larger radii — update `.pb-home2` / home styles without breaking Studio/calendar mid-flight.
- [ ] Slim sidebar IA + **New post** CTA + business switcher + profile chip.
- [ ] Fix Home self-framing double-chrome (`DashboardHome` remounts sidebar today).

### Phase 2 — Smart Home (2–3 days)

- [ ] Wire hero todos from posts/calendar/voice/Meta status APIs.
- [ ] Next up from next publishable post.
- [ ] Recently posted + Use again.
- [ ] Brand voice summary card.
- [ ] Studio entry card.
- [ ] Time saved heuristic + “Everything in sync” empty state.

### Phase 3 — Create spine (2–3 days)

- [ ] New post intent picker → Studio or composer.
- [ ] Strengthen schedule handoff Studio → Schedule.
- [ ] Align copy: Create / Schedule / publish (drop Dispatch/Queue language in UI).

### Phase 4 — Module rename + fold (2–3 days)

- [ ] Route aliases: `/dashboard/schedule` → calendar (or rename page).
- [ ] Library: photos + past posts + saved; primary **Use in a post**.
- [ ] Settings tabs per brief; keep Reports/Analytics there.
- [ ] Mobile nav + More sheet updated.

### Phase 5 — Polish + cut clutter (1–2 days)

- [ ] Remove home holiday-coverflow / weather / dense widgets that fight the calm brief (or demote).
- [ ] Motion: quiet entrances, no dashboard noise.
- [ ] Acceptance checklist (below) + smoke on Solo + Command.

---

## Structural files to touch first

| Area | Files |
|------|--------|
| Frame | `DashboardShell.tsx`, `dashboard-home-styles.tsx`, `AppSidebar.tsx`, `AppMobileNav.tsx` |
| Home | `DashboardHome.tsx` (+ new card components under `src/components/dashboard/home/`) |
| Plan gates | `plan-features.ts`, `PlanProvider` |
| Create handoff | `schedule-handoff.ts`, Studio + calendar composer |
| Tokens | `globals.css` `.pb-*` kit — evolve carefully |

**Escape hatches:** Studio (`.pb-studio`) and Brand book stay intentional deep surfaces; absorb into kit only where shared chrome matters.

---

## Acceptance checklist

- [ ] First action obvious: **Create / New post**
- [ ] No draft piles, issue lists, or analytics on home
- [ ] Layout feels premium, bold, simple; red used with intent
- [ ] User understands next step in &lt; 5 seconds
- [ ] Feels easier than Buffer / Meta Business Suite
- [ ] Solo stays calm; Command extras don’t pollute primary nav
- [ ] Voice + Studio + Schedule feel like one product loop

---

## Open decisions (need Brad)

1. **Figma vs product brief on home widgets** — Use Figma engagement cards, or calm Next-up / todos from the written brief? (Recommend calm + Figma chrome.)
2. **Create default** — Blank composer, Studio, or starter picker (Blank / Template / Library / Studio)?
3. **Drafts** — Fully remove from nav (Schedule filters + Library Posts), or keep as Library sub-tab?
4. **Command Ads** — Settings only vs secondary nav?
5. **Brand kit depth** — Voice sheet only for Solo, or keep full brand-book UI under Settings → Brand kit?
