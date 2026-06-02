# Full Audit Report — The Restaurant Creatives
**Date:** 2026-05-29  
**Branch audited:** `main` @ `9ee1a4c` (+ local working tree)  
**Method:** Part A verification + Part B static code audit (report only, no code changes)  
**Prompt:** `docs/CURSOR-AUDIT-PROMPT.md`

---

## Part A — Stale / contradicted claims

| Claim in Part A | Actual on `main` |
|-----------------|------------------|
| `/admin/preview` redirects to `/admin` | **Confirmed** — `src/app/admin/preview/page.js` |
| `/admin` renders `<Dashboard/>` + panels from `AdminWorkbench.jsx` | **Confirmed** — `src/app/admin/page.js` |
| Track route uses service-role + origin allowlist | **Confirmed** — `src/app/api/track/[slug]/route.js` (file header comment at L8–14 contradicts L33–47 — stale comment) |
| `robots.js` / `sitemap.js` exist | **Wrong on main** — not present; only `layout.js` metadata.robots |
| Deck media missing from git | **Wrong for this clone** — 78 files under `public/bartolinos/assets/` tracked; `public/brand/trc-logo.png` tracked |
| Sign-in renders error message (H8) | **Wrong on main** — `errorMsg` set but not rendered in JSX |
| Upstash rate limit on send route | **Partial** — implemented with silent no-op if env unset (`send-presentation/route.js`) |
| `schema.sql` matches runtime | **Stale** — no authenticated CRUD policies; no `cover_image`, `archived`, `pipeline_deals`, `admin_notes` |

---

## Surface 1 — Marketing site

| # | Severity | Dimension | Finding | File:line | Confidence | Impact | Proposed fix | Effort |
|---|----------|-----------|---------|-----------|------------|--------|--------------|--------|
| M1 | High | Bugs | `Interactions` binds magnetic/tilt handlers once on mount; new DOM after client navigation never wired | `Interactions.jsx:17-152`, `client-layout.js:57-62` | Confirmed | Hover polish breaks after first route change | Re-run on `pathname` change | M |
| M2 | High | Bugs | Chrome scroll progress uses `window.scrollY` while pages scroll via Lenis | `Chrome.jsx:28` vs `Menu.jsx:73-84` | Confirmed | Progress bar stuck/wrong | Drive from Lenis scroll | S |
| M3 | High | Broken links | Instagram/LinkedIn point to generic homepages, not TRC profiles | `page.js:337-338`, `Menu.jsx:540-545` | Confirmed | Looks unfinished | Real URLs or remove | S |
| M4 | Medium | Dead ends | Work cards use `href="#"` when no case URL | `page.js:237-244`, `work/page.js:178-184` | Confirmed | False affordance on tap | Non-link element or real URLs | S |
| M5 | Medium | Dead ends | `.programs-row` has pointer cursor, no click handler | `home.css:100-115`, `page.js:206-212` | Confirmed | Implies interactivity | Remove cursor or add link | S |
| M6 | Medium | Accessibility | Menu Open/Close are `<p>` in `<div onClick>` — not keyboard-focusable | `Menu.jsx:439-464` | Confirmed | KB/SR users can't open nav | Real `<button>` + ARIA | M |
| M7 | Medium | Accessibility | Skip-link CSS exists but no skip link in DOM | `globals.css:123-141` | Confirmed | No bypass fixed chrome | Add skip link in `client-layout.js` | S |
| M8 | Medium | Accessibility | GSAP `[data-reveal]` ignores `prefers-reduced-motion` | `page.js:121-137`, `globals.css:151-153` | Confirmed | Motion-sensitive users affected | Guard GSAP setup | M |
| M9 | Medium | Responsive | `isMobile` state never set — mobile Lenis config never applies | `client-layout.js:18-50` | Confirmed | Touch scroll tuning dead | Wire `matchMedia` | S |
| M10 | Low | Engineering | Orphan components never imported: `Footer`, `DynamicBackground`, etc. | `src/components/*` | Confirmed | Misleading project map | Remove or wire | M |
| M11 | Low | Legal | No privacy policy / terms on marketing site | — | Confirmed | Compliance gap | Add `/privacy` + footer link | M |

---

## Surface 2 — Studio login

| # | Severity | Dimension | Finding | File:line | Confidence | Impact | Proposed fix | Effort |
|---|----------|-----------|---------|-----------|------------|--------|--------------|--------|
| S1 | High | Bugs / UX | Login `errorMsg` set on failure but **never rendered** | `signin/page.js:15,80-82` | Confirmed | Users see wave only, no reason | `role="alert"` region | S |
| S2 | High | Security | Middleware **fail-open** when Supabase env missing | `middleware.js:7-12` | Confirmed | `/admin` unprotected on misconfig | Fail closed in production | S |
| S3 | Medium | UX | Label says "Client portal" but route is studio admin | `signin/page.js:100` | Confirmed | Wrong mental model | Rename to "Studio login" | S |
| S4 | Medium | UX | No forgot-password or back-to-site link | `signin/page.js` | Confirmed | Dead-end on lost password | Add reset flow + link | M |
| S5 | Medium | Engineering | Sign-in inherits marketing page `<title>` | `layout.js:7-11` | Confirmed | Confusing tab/password manager | Route-level metadata | S |
| S6 | Low | UX | Dead CSS for logo/title blocks not in JSX | `signin.css` vs `page.js` | Confirmed | Incomplete polish | Render or remove CSS | S |

---

## Surface 3 — Dashboard

| # | Severity | Dimension | Finding | File:line | Confidence | Impact | Proposed fix | Effort |
|---|----------|-----------|---------|-----------|------------|--------|--------------|--------|
| D1 | **Critical** | Bugs | Notifications bell calls **`goAdmin()`** — undefined; only `goManage` exists | `Dashboard.js:603` | Confirmed | ReferenceError on bell click | Fix handler name / scroll to Activity | S |
| D2 | **Critical** | Dead ends | Only `public/bartolinos/` deck exists; other slugs 404 after `/pitch` redirect | `pitch/[slug]/page.js:47`, `public/` | Confirmed | Non-bartolinos sends break | Multi-deck scaffold or slug guard | L |
| D3 | High | Security / Eng | `schema.sql` lacks authenticated RLS policies for admin CRUD | `schema.sql:43-51` | Confirmed (repo) | Fresh Supabase setup breaks admin | Full migration in repo | M |
| D4 | High | Dead ends | Sidebar nav (Clients, Decks, …) only toggles `active` — grid unchanged | `Dashboard.js:297-304` | Confirmed | 7 false nav items | Wire views or disable | M |
| D5 | High | Dead ends | "View all", "Last 30 days", "Studio Plan" — no handlers | `Dashboard.js` multiple | Confirmed | False affordances | Implement or remove | S–M |
| D6 | High | Dead ends | Pipeline tabs switch state but list never filters | `Dashboard.js:298,777-797` | Confirmed | Cosmetic tabs | Filter by tab | S |
| D7 | Medium | UX | Tracking display shows `trc.link/{slug}`; copy uses `/pitch/{slug}` | `dashboard-data.js:294` | Confirmed | Operator confusion | Show real URL | S |
| D8 | Medium | UX | Deck Preview is mock (gradient, "+12", generic kicker) | `Dashboard.js:716-733` | Confirmed | Misleading before send | Real thumb + title | M |
| D9 | Medium | Duplication | `/admin/manage` legacy workbench + notes/kanban vs new `/admin` | `AdminWorkbench.jsx` vs `Dashboard.js` | Confirmed | Split workflows | Consolidate or link | M |
| D10 | Medium | Responsive | `admin.css` has no `@media` for legacy manage route | `admin.css` | Confirmed | Poor mobile on `/admin/manage` | Deprecate or responsive pass | L |
| D11 | Low | UX | Downloads/Shares hardcoded "—" | `dashboard-data.js:164-165` | Confirmed | Incomplete row | Hide or tooltip | S |

---

## Surface 4 — Presentation (deck + APIs)

| # | Severity | Dimension | Finding | File:line | Confidence | Impact | Proposed fix | Effort |
|---|----------|-----------|---------|-----------|------------|--------|--------------|--------|
| P1 | **Critical** | Bugs | `/pitch/[slug]` anon slug lookup likely blocked — RLS on `presentations`, no anon SELECT in `schema.sql` | `pitch/[slug]/page.js:33-37`, `schema.sql:45-46` | Likely | Email links show "Deck not found" | Anon SELECT policy or server redirect | M |
| P2 | High | Security | No rate limit on `/api/track/[slug]` | `track/[slug]/route.js` | Confirmed | View count inflation | Upstash per-IP/session | M |
| P3 | High | Security | Service-role on track route (mitigated by origin allowlist) | `track/[slug]/route.js:48-53` | Confirmed | Key leak = full write | Rate limit + narrow RPC | M |
| P4 | High | SEO | No `robots.ts`; deck noindex only via meta + headers on `/bartolinos` | `layout.js:33`, `next.config.mjs` | Confirmed | Pitch routes may index | Add robots.ts + disallow | S |
| P5 | High | SEO | `X-Robots-Tag` / DECK_CSP only on `/bartolinos` and `/pitch/*`, not generic `/<slug>/` | `next.config.mjs:87-107` | Confirmed | Future decks indexable | Template headers per slug | M |
| P6 | Medium | Legal | View tracking + `ip_hash` + fingerprint overlay — **no viewer disclosure** | `index.html:6592-6771` | Confirmed | Privacy scrutiny | Notice + privacy policy link | M |
| P7 | Medium | Legal | Send email lacks physical address (CAN-SPAM if scaled) | `send-presentation/route.js:139-186` | Confirmed | Compliance if bulk | Footer address | S |
| P8 | Medium | UX | SendPanel copy implies email open tracking; only deck views tracked | `AdminWorkbench.jsx:246-249` | Confirmed | Misleading ops | Reword copy | S |
| P9 | Medium | Engineering | `data-track-*` attrs on deck never POST events | `index.html:3797+` | Confirmed | No funnel analytics | Wire or remove attrs | M |
| P10 | Medium | GSAP | Heavy ScrollTrigger + multiple refreshes — mobile jank risk | `index.html:5016+` | Needs-runtime-check | Pin drift on slow devices | iOS test pass | L |
| P11 | Low | Engineering | Stale contradictory comments in track route header | `track/[slug]/route.js:8-14` vs `33-47` | Confirmed | Maintainer confusion | Update header | S |

---

## Fix first (top 10, all surfaces)

1. **D1** — `goAdmin` ReferenceError on notifications bell  
2. **P1** — `/pitch/[slug]` slug validation vs RLS (email link send-blocker)  
3. **S1** — Render sign-in error message  
4. **S2** — Fail-closed middleware in production  
5. **D2** — Single static deck vs arbitrary slugs  
6. **D3** — Commit full Supabase RLS + schema to match app  
7. **P2** — Rate-limit track endpoint  
8. **M1** — Re-bind Interactions on route change  
9. **M2** — Fix Lenis vs window.scrollY progress bar  
10. **P4** — Add `robots.ts` + centralize pitch disallow  

---

## Send-blockers (before sending deck to a real prospect)

| # | Blocker | Why |
|---|---------|-----|
| 1 | **P1** — `/pitch/bartolinos` may 404 for anonymous recipients | Resend emails use `/pitch/{slug}`; RLS may block slug lookup |
| 2 | **D2** — slug must match `bartolinos` folder + rewrite | Any other slug breaks after send |
| 3 | **D1** — bell crash | Undermines trust in dashboard on send day |
| 4 | **P6** — no tracking disclosure | Confidential deck + fingerprint + IP hash without notice |
| 5 | **M3** — placeholder social links | If prospect visits marketing site from signature |
| 6 | Confirm **Supabase migration** applied (`ended_at`, `duration_seconds`) | Avg Time stays "—" without it |
| 7 | Confirm **Resend** + domain verified in prod | Send panel fails otherwise |

**Note:** Direct URL `https://therestaurantcreatives.com/bartolinos/` bypasses `/pitch` validation and may work even when P1 fails — but emailed links use `/pitch/{slug}` per send route.

---

## Intentional — do not "fix" without approval

- Deck owns view tracking; `/pitch/[slug]` must NOT insert views (double-count)  
- Dashboard gold accent `#c8a565` — do not reintroduce blue  
- Do not refactor `public/bartolinos/index.html` ScrollTrigger architecture casually  
- Downloads/Shares "—" until tracking exists  

---

*Report only. No code was modified during this audit pass.*
