# Beta notes — Cam (triaged 2026-06-05)

Raw notes from Cam's beta pass, triaged into: ✅ already fixed today · 🔴 security · 🐞 bugs · ✨ features · ❓ policy/strategy questions.
Priority: **P0** = ship now / safety, **P1** = core flow broken, **P2** = polish, **P3** = later.

---

## ✅ Already fixed in today's deploy (Cam should re-test on prod)
| Cam's note | Status |
|---|---|
| "Reports tab glitching, constantly blinking in and out, same with Issues tab" | **Fixed** — PageTransition opacity-stranding + Reports/Issues grid. Live on prod. |
| "Black buttons have black text, looks like a solid brick — editor, notifications, posting, account, brand voice, profile, schedule" | **Fixed for `.pb-btn-primary`** (label was invisible on dark fill). Live. ⚠️ Need to verify every page Cam listed actually uses `.pb-btn-primary` — some surfaces may use a different button class still affected. **Verifying coverage.** |
| (blue "Start Onboarding" button) | **Fixed** → brand red, points to current wizard. Live. |

---

## 🔴 Security / privacy — investigate IMMEDIATELY (possible cross-tenant leak)
| # | Cam's note | Why it's P0 |
|---|---|---|
| S1 | "Images of retail and mom on my account — need separate user data to keep people from sharing with each other on accident" | Suggests media from **different accounts is visible across tenants**. App uses RLS (`withTenantDb`) — if media is leaking across orgs this is a real isolation bug. Could also be shared demo-seed data. **Must confirm.** |
| S2 | "Random profile pic of someone added?" | An avatar belonging to **another user** appearing = possible PII/data leak, or a hardcoded placeholder. **Must confirm which.** |

→ **Action:** audit how media/photos + avatars are scoped per tenant/location; reproduce with two accounts. Until confirmed benign, treat as P0.

---

## 🐞 Bugs
| # | Cam's note | Pri | Notes |
|---|---|---|---|
| B1 | "JPG, PNG, files & screenshots not allowed on media upload" | **P1** | Upload rejecting the most common formats = core flow broken. Check accept filter + server validation in `/api/upload` + photos page. |
| B2 | "Edit function janky — no lock on the social preview, images fly and aren't layered, no text edit, limited editorial" | **P1** | Editor canvas needs a real fix: lock/layering, text editing, z-order. Big chunk. |
| B3 | "Crop tool not functioning" | **P1** | Editor crop broken. |
| B4 | "Needs undo / previous option" | **P1** | No undo in editor. |
| B5 | "No clear way to download image — publish only" | **P1** | Users want to export the generated image, not only publish. |
| B6 | "Home page is skewed and doesn't function well" | **P1** | Needs repro — layout/skew + broken function on dashboard home. |
| B7 | "Month moves when clicking through — lock in place" | **P2** | Calendar month view shifts on navigation; pin the grid. |
| B8 | "Lighting issue on create-tone — done the brightness" | **P2** | Create/tone screen brightness/contrast problem. Need repro. |
| B9 | "Why is there a weather widget?" | ~~P2~~ | **KEEP** — Brad's call (2026-06-05): weather widget stays. |
| B10 | "Schedule post button only had FB and IG for platform options" | **P2** | Expected today (FB/IG only). Confirm if more platforms (LinkedIn, etc.) are in scope. |
| B11 | "Video creation is a No" | **P2** | Video generation not working / not available — confirm intended scope. |

---

## ✨ Features / enhancements
| # | Cam's note | Pri |
|---|---|---|
| F1 | Options to **delete account** | P2 |
| F2 | **Payment page** in settings | P2 |
| F3 | **User profile verification** | P3 |
| F4 | **Export / import** options | P3 |
| F5 | Analytics **categories & depth** | P3 |
| F6 | Post-type selection: **carousel, multi-post, video, sizes** | P2 |
| F7 | Supported **file sizes & formats** (spec + UI hints) | P2 (ties to B1) |
| F8 | **Error logs + crash notifications** for users | P2 (observability) |
| F9 | **Server protection + automatic backup & recovery** | P2 (infra) |
| F10 | "Seamless setup" (onboarding polish) | P3 |

---

## ❓ Policy / strategy — need Brad's decision (not code)
| # | Question | Owner |
|---|---|---|
| Q1 | Backend security posture — overall hardening plan | Brad + eng |
| Q2 | MCP & integration security model | Brad |
| Q3 | **Are we allowed to integrate with these platforms?** (Meta/IG ToS for publishing + data) | Brad / legal |
| Q4 | "Collect data without stealing data from platforms" — data-handling boundaries | Brad / legal |
| Q5 | AI **token counts / cost per generation** — metering & pricing model | Brad |

---

## Suggested order of attack
1. **S1 + S2** (security) — confirm whether real leak or benign seed/placeholder. Fast investigation, highest stakes.
2. **B1** (uploads reject JPG/PNG) — blocks the core media flow.
3. **B6** (home skewed) + **B9** (weather widget) — visible on first load, quick wins.
4. **B5** (download image) — small, high-value.
5. **B2/B3/B4** (editor: layering, crop, undo) — bigger, schedule as a focused editor pass.
6. Features (F1 delete account, F2 payments) + policy questions (Q3/Q4) — plan separately.
