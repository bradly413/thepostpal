# Meta App Review — Dashboard Audit + Submission Kit

**Date:** 2026-07-23 · **App:** Posterboy Social · **App ID:** 4470114259980817
**Audited:** live App Dashboard walk (read-only) + cross-check against `src/lib/meta.ts` scopes.

---

## TL;DR — the two-track answer

**Track 1 — closed beta (this week, no App Review needed):**
The Publish page says **"All required app settings are complete"** and the Publish button is active. Publish the app to Live, add each beta invitee as an app **Tester** (0 of 50 slots used). Business permissions at Standard Access work for anyone holding an app role — and Live mode means posts testers publish through Posterboy are publicly visible (in Dev mode, posts made via the app are only visible to role-holders).

**Track 2 — public launch (App Review):**
Blocked behind **"Become a Tech Provider"** — Meta's new gate for apps that access data on behalf of *other* businesses (which is exactly what Posterboy does for tenants). That flow includes business/access verification of Bradly Robert Creative LLC. Only after that can Advanced Access requests (with screencasts) be submitted.

---

## Verified dashboard state

| Area | Status |
|---|---|
| Mode | In development (Unpublished) — Publish button ACTIVE |
| Required actions | None ✓ |
| Settings → Basic | Display name, domains (`posterboysocial.com`), contact email, privacy `/privacy`, terms `/terms`, data-deletion `/data-deletion`, category "Business and pages" — all ✓ |
| **App icon** | **EMPTY — Gap #1** (1024×1024 PNG needed; required for App Review, not for publishing) |
| Use cases | Pages API + Instagram API, both configured ✓ (dashboard checklist 3/4 green) |
| FBLB OAuth redirect URIs | Only `https://www.posterboysocial.com/api/auth/meta/callback` ✓ (matches the canonical connect flow) |
| API version | v25.0 (matches `GRAPH` const) |
| App roles | Brad Nichols (Administrator) only. **Testers 0/50 — Gap #5** |
| Tech Provider | **Not enrolled — Gap #6** (required to submit App Review) |

## Permission truth table (dashboard vs. code)

Code scopes — standard connect (`src/lib/meta.ts:26`): `pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish`
Code scopes — ads flow (`src/lib/meta.ts:35`): `ads_management, ads_read, business_management (+pages_show_list)`

| Permission | In use case? | Status | Code needs it? | Verdict |
|---|---|---|---|---|
| pages_show_list | ✓ (both) | Ready for testing (235 calls) | ✓ connect | OK — request Advanced |
| pages_manage_posts | ✓ Pages | Ready for testing (31) | ✓ publish | OK — request Advanced |
| pages_read_engagement | ✓ (both) | Ready for testing (235) | ✓ voice-samples, insights parse | OK — request Advanced |
| instagram_basic | ✓ IG | Ready for testing (178) | ✓ connect | OK — request Advanced |
| instagram_content_publish | ✓ IG | Ready for testing (141) | ✓ publish | OK — request Advanced |
| business_management | ✓ (both) | Ready for testing (135) | ads flow only | Keep; needed if ads ships |
| **read_insights** | **✗ not added** | — | **✓** `/{pageId}/insights` in `api/meta/insights/route.ts:89` | **Gap #2 — add to Pages use case** |
| **instagram_manage_insights** | **✗ not added** | — | **✓** `/{igAccountId}/insights` in `api/meta/insights/route.ts:94` | **Gap #2 — add to IG use case** |
| ads_management / ads_read | ✗ not added | — | ads flow (`getAdsLoginUrl`) | Gap #3 — only if Ads feature ships publicly |

> Analytics works today only because Brad is app admin. Without adding + approving the two insights permissions, `/dashboard/analytics` breaks for every real customer.

## Gap list (ordered)

1. **App icon missing** — upload 1024×1024 PNG (red posterboy mark on paper `#f7f4ee`, no text-only logo; Meta rejects screenshots/wordmark-only icons at review). Settings → Basic.
2. **Insights permissions absent** — add `read_insights` (Pages use case) + `instagram_manage_insights` (IG use case) via "Add more to this use case". No code change needed to *add* them; the connect flow scope string should grow to request them at OAuth (`SCOPES` in `src/lib/meta.ts:26`) once added.
3. **Ads OAuth redirect not whitelisted** — `https://www.posterboysocial.com/api/meta/ads/callback` is not in Valid OAuth Redirect URIs → the ads connect flow 400s in prod today. Add it only when the Ads feature ships (it also needs `ads_management`/`ads_read` added + reviewed). Note: `getLoginUrl`/`REDIRECT_URI` (`/api/meta/callback`) is dead code — candidate for deletion.
4. **Data Deletion Callback URL empty** (FBLB settings) — we have the instructions *URL* on Basic (compliant), but implementing the callback endpoint removes the "download + purge user identifiers" chore Meta imposes otherwise.
5. **Testers 0/50** — add each beta invitee (App roles → Testers). They accept the invite, then Meta connect works for them at Standard Access.
6. **Tech Provider not enrolled** — Dashboard card: "Become a Tech Provider to submit to App Review… You'll be required to complete access verification." This is Brad-only (LLC legal name, business docs, domain/email verification with brad@posterboysocial.com).
7. **App unpublished** — once 1 (and ideally 5) are done, hit Publish. Everything else can follow.

## Drafted use-case descriptions (paste into App Review)

**App-level description:**
> Posterboy Social is a social media studio for local businesses. An owner connects their Facebook Page and Instagram Business account once; Posterboy then generates on-brand post images and captions with AI, and publishes or schedules them to the connected accounts at the owner's direction. Analytics from the Page and IG account are shown back to the owner in a simple dashboard.

**pages_show_list**
> After Facebook Login, we list the Pages the user manages so they can pick which Page to connect to their Posterboy workspace. The selection is stored and used as the publish destination. Without this permission the user cannot choose a Page and the product cannot function.

**pages_manage_posts**
> The core product action: when a user approves a post (immediately or scheduled), Posterboy publishes the image + caption to their chosen Page on their behalf. Users see every post before it publishes; nothing is posted without explicit approval or an explicit user-set schedule.

**pages_read_engagement**
> Two uses: (1) we read the user's recent Page posts so our AI can match how the business actually writes (voice matching); (2) we read Page metadata (name, picture) to display the connected account in the dashboard.

**instagram_basic**
> We read the Instagram Business account linked to the user's Page (username, profile) to display the connected account and resolve the IG account ID used for publishing.

**instagram_content_publish**
> When the user approves an Instagram post, we publish the approved image + caption to their IG Business account via the Content Publishing API — same explicit approve/schedule flow as Pages.

**read_insights** *(after Gap #2)*
> We show the owner a simple analytics dashboard of their own Page performance (impressions, engagement, fans) for the posts published through Posterboy.

**instagram_manage_insights** *(after Gap #2)*
> Same analytics dashboard, Instagram side: reach, impressions, and engaged accounts for the connected IG Business account.

## Screencast script (one recording covers all permissions)

Record 1280×800+, logged into a **test user's** Facebook with a real test Page + linked IG Business account. Narrate or caption each step. ~3 minutes.

1. **0:00** — Open `https://www.posterboysocial.com`, click Sign in, log into a Posterboy account. (Shows the app is a real product.)
2. **0:20** — Dashboard → Settings/Connect → click **Connect Facebook & Instagram**. Facebook Login for Business dialog appears — pause on the permission screen so every requested permission is visible. Accept.
3. **0:45** — Page picker: the list of Pages appears (**pages_show_list**). Select the test Page. Show the connected badge with Page name + avatar (**pages_read_engagement** metadata, **instagram_basic** profile).
4. **1:10** — Create a post: type a prompt, generate image + caption, click through to the approval screen. Emphasize the explicit **Approve/Schedule** step.
5. **1:30** — Approve → publish now. Switch to facebook.com, open the test Page, show the post live (**pages_manage_posts**).
6. **1:50** — Repeat for Instagram: approve an IG post, open instagram.com, show it live on the IG Business profile (**instagram_content_publish**).
7. **2:20** — Open `/dashboard/analytics`, show Page + IG metrics rendering (**read_insights**, **instagram_manage_insights**).
8. **2:45** — Settings → Disconnect, showing the user can revoke; mention `/data-deletion` page.

Upload the same video to each permission's review form; the per-permission text above tells reviewers which timestamp matters.

## Order of operations for Brad

1. Upload app icon (5 min).
2. I add the two insights permissions to the use cases + extend the OAuth `SCOPES` string (code change, needs your go).
3. Publish the app (button is live).
4. Add beta invitees as Testers → start the beta. **App Review is NOT a beta blocker.**
5. When ready for public: Become a Tech Provider → business verification (LLC docs) → record screencast → submit Advanced Access for the 7 permissions → Data Use Checkup when prompted.
