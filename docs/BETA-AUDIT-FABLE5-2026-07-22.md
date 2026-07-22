# Beta audit — Fable 5 — 2026-07-22

> Full interactive audit against **prod** (main @ `3143d77`, deploy Ready) — browser-walked
> marketing, onboarding, and dashboard (demo session via the smoke-harness auth pattern), plus
> code verification of signup-only seams. Supersedes the earlier static-analysis version of this
> file; its still-valid findings are folded in below.
> Note: another editor was actively updating marketing copy (beta-honest CTAs, pricing terms)
> during this audit — several "should fix" items are already in flight in the local tree.

## Verdict

**Yes — invite the first testers, after one 30-minute fix.** Infrastructure is clean
(launch-check 7/7, smoke 12/12, cron ticks 200), the tester path matches the guide, dashboard
truth is honest (no fake metrics, real queue values, honest Meta states, exemplary free-beta
billing copy), and Studio image generation works end-to-end on prod (verified live: prompt →
`/api/generate-image` 200 → image → appears in Library). The one code blocker: **Studio's
initial-state "Make a post" button renders off-screen at common laptop widths**, and Studio is
step 1 of the tester script. Fix that, redeploy, invite.

## Blockers

- [ ] **Studio composer: generate button off-screen at ≤~1360px viewports (first-run state).**
  Measured on prod at a 1180px viewport: prompt input right edge 1323px, composer bar right edge
  1342px, "Make a post" button at x 1212–1327 — fully outside the viewport, and the container
  clips (no horizontal scroll). A tester in a 1280px browser window types a prompt and has **no
  visible way to submit**. Enter does submit (verified — generation returned 200), but nobody
  will discover that. The **post-generation** layout centers correctly and is fine — this is the
  initial empty state only, i.e. the very first screen of the tester script. Files:
  `PosterboyStudio.tsx` / `studio-styles.tsx` (both carry uncommitted local edits — possibly this
  exact fix; verify at 1280/1440, commit, deploy).
- [ ] **Ops (Brad, not code): add each invitee as a Meta app Tester** (Dev-mode OAuth). Without
  it, Settings → Connect with Facebook fails, which blocks steps 2–3 of the tester guide. While
  in the FB app console, confirm the OAuth redirect URI matches what the code expects
  (`META_AUTH_REDIRECT_URI`).

## Should fix before/soon after invites

- [ ] **Voice Architect input is animation-gated with no failsafe.** The answer field mounts
  `visibility:hidden` and is revealed only by the GSAP entrance timeline. If frames are throttled
  (background tab, low-power mode), the question renders but can never be answered. Same bug
  class was already fixed in marketing `Hero.tsx` with a setTimeout progress failsafe — port that
  pattern to `VoiceArchitect.tsx` (reveal logic ~line 224). Not reproducible in normal foreground
  browsing, but it is the front door of the product.
- [ ] **Dashboard home "Coming up" lists past-dated items** ("Scheduled for Jul 14/15/16 at
  9:00 AM" — a week ago) while "Next up" correctly says "Nothing scheduled yet." Filter the list
  to future-dated queue items or relabel past ones. (Observed on demo-org; the logic ships to all
  tenants.)
- [ ] **Marketing beta-copy alignment** — prod still says "Start free trial" (hero secondary,
  nav); the local tree already has the fix ("Join free beta", "Closed beta · free · no card
  required.", beta FAQ, pricing "Price shown is post-beta Solo"). Ship that batch; include
  `ChatbotWidget.tsx`, which still pitches "free trial."
- [ ] **Pricing feature names don't match the product testers see.** Solo lists "Calm Room
  content workspace" and "Visual Grid Planner" — neither appears in the dashboard (nav is
  Create/Schedule/Library). Rename to the real surfaces: Creator Studio, auto captions, bulk
  scheduling, calendar. (`src/lib/pricing.ts` features array.)
- [ ] **Studio "Video" tab is prominent while video publish is beta-blocked.** The block error is
  clear and verified ("Video publish is not available in closed beta.", `calendar/page.tsx:1074`),
  but the equal-weight Video tab invites testers into a dead end — consider a "Soon" badge
  matching the Settings platform treatment.
- [ ] **`/onboarding` has no `h1`** (question text is styled spans). Minor a11y/SEO; one-line fix.
- [ ] **1 failed prod post** on demo-org (`cmrfd6gdw0001k1049cam4mv1`, Graph API "reduce the
  amount of data") — Retry/Skip from the dashboard when convenient; not tester-visible.

## OK for closed beta

- **Infrastructure:** launch-check 7/7 — deploy Ready, smoke 12/12, cron ticks 200, DB queue
  healthy (draft 1 / published 28 / failed 1, no stuck claims, no zombie `scheduled` rows), all
  required env present.
- **Marketing (browser-walked, desktop + 375px):** no console errors, no horizontal overflow,
  single h1, all 31 links resolve; every signup CTA → `/sign-in?mode=signup&next=%2Fonboarding`
  (+ `plan=solo` / `billing` variants); **zero** `/onboarding/classic` references; pricing math
  verified ($99 / $79-annual / $948-yr / save $240-yr; Command $249 + $39/location) with honest
  "Free to start. No credit card required."; FAQ accurate on platforms, approvals, publishing.
- **Onboarding:** guest `/onboarding` loads Voice Architect and accepts input. Code-verified
  seams: authenticated completion → `router.push("/dashboard")` (`VoiceArchitect.tsx:423`) ✓;
  guest completion → brand book generated + cached → `/sign-in?next=%2Fdashboard` (line 401) ✓;
  honest failure copy ("Couldn't build your voice. Check your connection and try again.") ✓;
  inputs labeled via `FloatingField` ✓. *Not run by me:* one full fresh-signup walkthrough
  (account creation is outside what I automate) — worth a 2-minute incognito pass by Brad before
  the first invite email.
- **Dashboard home:** honest — Posts Scheduled 0 / This Week 0 from the real queue, Audience
  8 followers from live Meta insights, Top Performing from real posts (zero engagement shown as
  zeros, not mocks), no salad/113 leftovers, initials avatar, holiday create-post card, Beta
  feedback widget bottom-right.
- **Nav:** one shared sidebar everywhere (Studio included — no nested shell), `posterboy™`
  wordmark → `/dashboard`, Create/Schedule/Library/Content/Settings all hard-navigate.
- **Studio:** image generation works on prod — real end-to-end run this audit (prompt → 200 →
  editable result with platform selector, edit rail, schedule/send actions) and the output landed
  in Library (59 items, newest first). Post-generation layout is correct at audited widths.
- **Schedule:** composer + populated calendar for the Meta-connected demo org; unconnected-tenant
  gating verified in code ("Connect Facebook & Instagram in Settings before scheduling —
  otherwise the post won't publish.", line 1389; publish guard line 1078).
- **Settings:** Account — Meta shown connected (FB + IG business), LinkedIn/TikTok/X/YouTube all
  "· Soon", change password, sign out, delete-account with clear consequences, Privacy/Terms
  links. Billing — exemplary copy: "Closed beta — no card required. You're on Solo for free while
  we learn with you. Paid checkout stays available when you're ready."
- **Content/Drafts:** honest counts ("2 drafts ready to schedule"), "Your week is drafted."
  voice, working library link, Schedule-all / Send-to-editor actions.
- **Invite URL + guide:** `docs/BETA-TESTER-INSTRUCTIONS.md` matches observed product behavior
  step-for-step, including the known-limits list.

## Smoke / launch-check

```
Posterboy launch check — 2026-07-22 13:48 CDT
PASS: 7   FAIL: 0 — "Launch-ready as far as machines can tell."
✓ production deploy READY (angie-social-portal-guj5jysld)
✓ smoke-prod PASS: 12   ✓ cron ticks 200
✓ DB queue healthy (no stuck claims, no zombies; 1 failed post noted)
✓ required env present
```

Live functional checks this audit: `/api/generate-image` 200 (real generation),
`/api/tools/what-to-post` engine live, session auth + tenant-scoped pages all rendering.

## Suggested next commits

1. **fix(studio): keep the first-run composer + "Make a post" inside the viewport**
   (measurements above; likely the uncommitted `studio-styles.tsx` WIP — verify at 1280/1440,
   commit, deploy).
2. **feat(marketing): ship the in-flight beta-honest copy batch** ("Join free beta", closed-beta
   terms, beta FAQ, pricing post-beta note) + `ChatbotWidget` + pricing feature-name cleanup.
3. **fix(onboarding): reveal failsafe + h1** in `VoiceArchitect.tsx` (port the Hero.tsx pattern).
4. **fix(home): filter "Coming up" to future-dated items** (or relabel past ones).
5. **chore(studio): "Soon" badge on the Video tab** during beta.
6. After 1–2 land: redeploy → launch-check → Brad's incognito signup walk → send invites.
