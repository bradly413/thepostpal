# Beta ops checklist — after deploy `bda7d68` / launch-check 7/7

## Done by agent (2026-07-22)

- [x] Pushed go-live fixes to `origin/main`; production Ready aliased to posterboysocial.com
- [x] Launch-check 7/7, smoke 12/12
- [x] `/data-deletion` public (guest 200, no sign-in redirect)
- [x] Mobile remeasure @ 390/430: Studio Create post in-viewport; Schedule no longer overlaps AppMobileNav (13px gap)
- [x] Failed demo post `cmrfd6gdw0001k1049cam4mv1` set to `skipped`
- [x] Marketing CTAs show "Join free beta" on live
- [x] Fresh signup account created + landed on Voice Architect (`beta+whbztw@posterboysocial.com`) — personality→dashboard automation incomplete (CTA readiness / connect steps)

## Brad must finish in Meta App Dashboard

Facebook Developers → your Posterboy app:

1. **App mode:** Development (closed beta) or Live. If Development, every invitee must be a **Tester** (or Admin/Developer) and must **accept** the invite in their Facebook notifications.
2. **Valid OAuth Redirect URIs** must include exactly:
   - `https://www.posterboysocial.com/api/auth/meta/callback` (canonical — `META_AUTH_REDIRECT_URI`)
   - optionally also `https://www.posterboysocial.com/api/meta/callback` (legacy route still exists)
3. Confirm `NEXT_PUBLIC_META_APP_ID` / `META_APP_SECRET` match this app.

## Remaining product verification

- [ ] Finish one full path: signup → Voice Architect complete → `/dashboard` → Connect Facebook → schedule image → wait for cron (~5 min) → status `published` + live on FB+IG
- [ ] Add each invitee as Meta App Tester before sending the invite email
- [ ] Optional: delete or leave draft the test approved post `cmrwhg6ir0005ky049bbpilyi` if cron has not yet claimed it

