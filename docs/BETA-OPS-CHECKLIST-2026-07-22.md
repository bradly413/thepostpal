# Beta ops checklist — after deploy `bda7d68` / launch-check 7/7

## Done by agent (2026-07-22)

- [x] Pushed go-live fixes to `origin/main`; production Ready aliased to posterboysocial.com
- [x] Launch-check 7/7, smoke 12/12
- [x] `/data-deletion` public (guest 200, no sign-in redirect)
- [x] Mobile remeasure @ 390/430: Studio Create post in-viewport; Schedule no longer overlaps AppMobileNav (13px gap)
- [x] Failed demo post `cmrfd6gdw0001k1049cam4mv1` set to `skipped`
- [x] Marketing CTAs show "Join free beta" on live
- [x] Fresh signup account created + landed on Voice Architect (`beta+whbztw@posterboysocial.com`) — personality→dashboard automation incomplete (CTA readiness / connect steps)

## Meta App Dashboard (agent pass 2026-07-22)

App: Posterboy Social (`4470114259980817`)

### Done
- [x] **App mode:** **Published** (Brad requested 2026-07-22) — invitees can Connect without being Testers for permissions Meta allows in Live; advanced Page/IG permissions may still need App Review if Connect prompts for restricted scopes
- [x] **App settings → Basic:** Privacy `https://www.posterboysocial.com/privacy`, Terms `https://www.posterboysocial.com/terms`, Data deletion instructions `https://www.posterboysocial.com/data-deletion`, App domain `posterboysocial.com`
- [x] **Facebook Login for Business → Settings:** Valid OAuth Redirect URI includes canonical  
  `https://www.posterboysocial.com/api/auth/meta/callback`  
  (Client OAuth login + Web OAuth login = Yes; Enforce HTTPS = Yes)
- [x] Roles page open; only **Brad Nichols = Administrator** so far

### Still needs Brad (human identity resolve)
- [ ] Add each invitee as **App roles → Roles → Add People → Tester**
  - Do **not** use **Test users** (fake accounts; Meta disabled create)
  - Do **not** enter Brad’s Facebook ID (`1307610784` triggered “move all admins”)
  - Prefer: invitee’s FB email / numeric profile ID, then **select their person card** from autocomplete before Add
  - Invitee must **Accept** (Facebook → Settings → Apps and Websites → Requests)
  - If autocomplete never finds them: have them register at developers.facebook.com, then retry
- [ ] Optional: also list legacy redirect `https://www.posterboysocial.com/api/meta/callback` (chip commit flaky in Meta UI; canonical alone is enough for prod)
- [ ] Confirm Vercel prod `NEXT_PUBLIC_META_APP_ID` = `4470114259980817` and secret matches this app

## Remaining product verification

- [ ] Finish one full path: signup → Voice Architect complete → `/dashboard` → Connect Facebook → schedule image → wait for cron (~5 min) → status `published` + live on FB+IG
- [ ] Add each invitee as Meta App Tester before sending the invite email
- [ ] Optional: delete or leave draft the test approved post `cmrwhg6ir0005ky049bbpilyi` if cron has not yet claimed it

