# Claude Code — Audit Findings & Fix Pass (May 2026)

Copy this doc (or the paste blocks below) into a **Claude Code** session when fixing issues found in the 2026-05-29 audit.

**Repo:** https://github.com/brn4040-prog/therestaurantcreatives-pitches  
**Local path:** `~/Desktop/ventures/the-restaurant-creative/therestaurantcreatives-pitches`  
**Audited branch:** `main` @ `9ee1a4c`  
**Full tables:** `docs/AUDIT-2026-05-29-REPORT.md`  
**Audit prompt used:** `docs/CURSOR-AUDIT-PROMPT.md`

---

## Executive summary

The app is **close to send-ready for Bartolino's** if slug is `bartolinos`, but several **confirmed bugs block a confident prospect send**:

1. **Email links may 404** — `/pitch/[slug]` validates slug via anon Supabase SELECT; `schema.sql` has no anon read policy on `presentations`.
2. **Dashboard bell crashes** — `goAdmin()` is undefined (`Dashboard.js:603`).
3. **Sign-in errors invisible** — `errorMsg` set but never rendered.
4. **Only one static deck** — `public/bartolinos/`; any other slug 404s after redirect.

Marketing site, legacy `/admin/manage`, and deck GSAP are polish/a11y debt — not send-blockers except placeholder social URLs and missing privacy disclosure on the confidential deck.

---

## Quick start

```bash
cd ~/Desktop/ventures/the-restaurant-creative/therestaurantcreatives-pitches
git checkout main && git pull
npm install
npm run dev   # http://localhost:3000
claude
```

**Auth:** `/signin` — `brn4040@gmail.com` / `TRCpitches2024!`  
**Dashboard:** `/admin` (primary) · `/admin/manage` (legacy workbench)

---

## Send-blockers — fix before emailing a prospect

| ID | Issue | Fix approach | Files |
|----|-------|--------------|-------|
| **P1** | Anon `/pitch/bartolinos` may show "Deck not found" | **Option A (preferred):** server-side slug check in a Route Handler or move redirect to middleware — don't rely on browser anon SELECT. **Option B:** Supabase policy `anon SELECT id, slug FROM presentations WHERE status IN ('sent','live')`. **Verify:** incognito window → `/pitch/bartolinos` → redirects to `/bartolinos/` | `src/app/pitch/[slug]/page.js`, `src/lib/schema.sql` or new `db/migrations/` |
| **D1** | Bell click → `ReferenceError: goAdmin is not defined` | Replace `goAdmin("view=activity")` with scroll/focus Activity card on `/admin`, or `goManage("view=activity")` if manage supports it | `src/components/Dashboard.js:603` |
| **D2** | Only `bartolinos` deck on disk | Until multi-deck: validate slug on create (must match existing `public/<slug>/`), or block send if folder missing. Document in UI. | `AdminWorkbench.jsx` CreatePanel, `dashboard-data.js` |
| **S1** | Login failure shows wave only | Render `{errorMsg && <p role="alert">…</p>}`; persist until field edit; generic copy for security | `src/app/signin/page.js` |
| **P6** | Deck tracks views + fingerprint with no disclosure | One line near confidential header: "This page uses analytics to measure engagement." Link to `/privacy` when it exists. | `public/bartolinos/index.html` (~3972) |
| **Infra** | Duration + Resend | Confirm prod: `ended_at`/`duration_seconds` columns exist; `RESEND_API_KEY` + domain verified | Supabase dashboard, Vercel env |

**Smoke test after P1 + D1 + S1:**
```bash
npm run build
# Incognito: /pitch/bartolinos → /bartolinos/
# /signin wrong password → visible error text
# /admin → click bell → no console error
```

---

## Fix-first batch (top 10, ordered)

Do these in order after send-blockers if time allows.

| # | ID | Task | Effort |
|---|-----|------|--------|
| 1 | S2 | Middleware fail-**closed** in production when Supabase env missing | S |
| 2 | D7 | Show real `/pitch/{slug}` in Tracking Links, not `trc.link/{slug}` | S |
| 3 | P4 | Add `src/app/robots.ts` — disallow `/admin`, `/signin`, `/pitch`, private decks | S |
| 4 | P2 | Rate-limit `POST /api/track/[slug]` (mirror send-route Upstash pattern) | M |
| 5 | D3 | Expand `schema.sql` + migration: authenticated CRUD policies, `cover_image`, `archived`, missing tables | M |
| 6 | D6 | Pipeline tabs: filter Hot Leads vs All Links | S |
| 7 | M2 | Chrome progress bar: use Lenis scroll, not `window.scrollY` | S |
| 8 | M1 | `Interactions`: re-bind on `pathname` change | M |
| 9 | M6 | Menu open/close → real buttons + `aria-expanded` | M |
| 10 | P11 | Fix stale comments in track route header (service-role, not anon) | S |

---

## Confirmed findings by surface (reference IDs)

Use these IDs when committing or in PR descriptions.

### Marketing (`M*`)
- **M1** Interactions not re-bound after navigation — High  
- **M2** Scroll progress desynced from Lenis — High  
- **M3** Placeholder Instagram/LinkedIn URLs — High  
- **M4–M5** Dead-end work cards / program rows — Medium  
- **M6–M8** Menu a11y, skip link, reduced-motion — Medium  
- **M9** `isMobile` never set — Medium  
- **M10–M11** Orphan components, no privacy page — Low  

### Sign-in (`S*`)
- **S1** Error message not rendered — High  
- **S2** Middleware fail-open — High  
- **S3–S6** Copy, metadata, forgot-password, dead CSS — Medium/Low  

### Dashboard (`D*`)
- **D1** `goAdmin` crash — **Critical**  
- **D2** Single deck folder — **Critical**  
- **D3** schema.sql vs runtime drift — High  
- **D4–D6** Dead nav, View all, pipeline tabs — High  
- **D7–D11** trc.link display, mock preview, manage duplication — Medium/Low  

### Deck + APIs (`P*`)
- **P1** `/pitch` RLS slug lookup — **Critical (Likely)**  
- **P2–P3** Track rate limit + service-role — High  
- **P4–P5** robots.ts + per-slug noindex headers — High  
- **P6–P9** Privacy, email compliance, misleading copy, dead track attrs — Medium  
- **P10** GSAP mobile jank — Needs runtime test  
- **P11** Stale track route comments — Low  

---

## Do NOT break (intentional decisions)

- **Deck owns view tracking.** `/pitch/[slug]` must NOT insert into `presentation_views` (double-count + no duration). See comment in `pitch/[slug]/page.js:11-16`.
- **Dashboard accent is gold `#c8a565`.** Do not reintroduce blue (`#0097B2`).
- **Do not refactor** `public/bartolinos/index.html` ScrollTrigger/pin architecture casually — flag only unless fixing a confirmed bug.
- **Downloads / Shares "—"** on dashboard until tracking exists — hide or tooltip, don't fake data.
- **No new founder personal names** in copy. No "social media management" positioning — creative studio.

---

## Part A doc is stale on these points

`docs/CURSOR-AUDIT-PROMPT.md` Part A claims the following — **verify before trusting**:

| Stale claim | Reality on `main` |
|-------------|-------------------|
| `robots.js` / `sitemap.js` exist | Not on `main` (may exist on unmerged audit branch) |
| Sign-in shows errors | `errorMsg` never rendered |
| Deck assets missing from git | 78 files tracked under `public/bartolinos/assets/` |
| `/admin/preview` is live dashboard | Redirects to `/admin` |
| Track route header says "anon key" | Implementation uses **service-role** (`route.js:48-53`) |

---

## Architecture snapshot (for fixes)

```
Marketing (/, /work, /studio, /contact)
  └── client-layout.js → Lenis + Menu + Chrome + Interactions

/signin → Supabase auth → middleware → /admin

/admin (primary)
  └── page.js → <Dashboard callbacks> + SendPanel/CreatePanel/EditPanel from AdminWorkbench.jsx
  └── dashboard-data.js → Supabase analytics

/admin/manage (legacy) → full AdminWorkbench (notes, kanban, old CSS)

/pitch/[slug] → validate slug → redirect /{slug}/
/{slug}/       → public/{slug}/index.html (static deck)
                 └── inline script → POST /api/track/{slug} start + end/duration

/api/send-presentation → auth + optional Upstash → Resend
/api/track/[slug]      → origin allowlist + service-role → presentation_views
```

**Only deck folder today:** `public/bartolinos/`  
**Rewrite in next.config.mjs:** `/bartolinos` → `/bartolinos/index.html`

---

## Paste prompt — Send-blocker fix pass

```
Read docs/CLAUDE-AUDIT-FINDINGS.md and docs/AUDIT-2026-05-29-REPORT.md.

Repo: therestaurantcreatives-pitches, branch main.

Fix ONLY the send-blockers in order:
1. P1 — /pitch/[slug] must work in incognito (anon recipient). Prefer server-side
   slug validation or Supabase anon SELECT policy. Do NOT re-add view insert on
   /pitch (deck owns tracking).
2. D1 — goAdmin ReferenceError on Dashboard bell (Dashboard.js:603).
3. S1 — Render sign-in errorMsg with role="alert".
4. D7 — Tracking links show /pitch/{slug} not trc.link (dashboard-data.js:294).

Rules:
- Read files before editing. Minimal diffs.
- npm run build must pass.
- Do not deploy unless I ask.
- Do not touch deck GSAP architecture except P6 disclosure if quick.

After fixes, tell me exactly how to smoke-test each item.
```

---

## Paste prompt — Dashboard dead-end cleanup

```
Read docs/CLAUDE-AUDIT-FINDINGS.md.

Fix dashboard false affordances on main (small diffs only):
- D6: Pipeline tabs filter list (Hot Leads vs All Links)
- D4: Either disable sidebar nav items with aria-disabled + tooltip "Coming soon",
  OR remove click handlers that imply navigation
- D5: Remove or wire "View all" / "Last 30 days" (chip can be static label if no filter yet)
- D8: Deck Preview uses featured deck's real clientName + title from data.decks[0]

Do not reintroduce blue. Gold accent #c8a565 only.
npm run build before done.
```

---

## Paste prompt — Marketing a11y pass

```
Read docs/CLAUDE-AUDIT-FINDINGS.md.

Marketing-only fixes on main:
- M2: Chrome progress from Lenis scroll
- M6: Menu open/close as <button> with aria-expanded
- M7: Skip link to #content in client-layout.js
- M3: Remove or fix placeholder Instagram/LinkedIn URLs

Skip orphan component deletion unless trivial.
npm run build before done.
```

---

## Verification checklist (post-fix)

### Send path
- [ ] Incognito: `GET /pitch/bartolinos` → redirects to `/bartolinos/`, deck loads
- [ ] Deck fires `POST /api/track/bartolinos` `{event:"start"}` (Network tab)
- [ ] Close tab → duration written (`ended_at`, `duration_seconds` in Supabase)
- [ ] `/admin` Send Panel → test send to yourself → email link works
- [ ] Wrong password at `/signin` → readable error

### Dashboard
- [ ] Bell icon click — no console error
- [ ] Tracking Links row shows `/pitch/bartolinos`
- [ ] Copy link → clipboard matches display URL

### Security
- [ ] Unauthenticated `POST /api/send-presentation` → 401
- [ ] `/admin` without session → redirect `/signin`
- [ ] `npm run build` exit 0

---

## Related docs

| File | Purpose |
|------|---------|
| `docs/AUDIT-2026-05-29-REPORT.md` | Full severity tables (all 4 surfaces) |
| `docs/CURSOR-AUDIT-PROMPT.md` | Original audit instructions (Part A context) |
| `docs/CLAUDE-HANDOFF.md` | Repo setup, PRs, env, git rules |
| `src/lib/schema.sql` | Baseline schema (incomplete vs app — see D3) |

---

## Open PRs (may overlap with fixes above)

| PR | Branch | Notes |
|----|--------|-------|
| [#1](https://github.com/brn4040-prog/therestaurantcreatives-pitches/pull/1) | `audit/cursor-2026-05-29-fixes` | May already fix S1, P4, robots, sign-in — **merge or cherry-pick before duplicating work** |
| [#2](https://github.com/brn4040-prog/therestaurantcreatives-pitches/pull/2) | `feature/studio-dashboard` | Light dashboard was merged into `/admin` on main; PR may be partially stale |

**Before fixing on `main`:** run `git log main..audit/cursor-2026-05-29-fixes --oneline` and skip items already patched on the audit branch.

---

*Generated from Cursor audit pass, 2026-05-29. Report-only audit; fix pass is separate and requires explicit approval.*
