# API smoke matrix — production results

**Generated:** 2026-05-23 (overnight Day-2 prep, Task F)
**Target:** https://www.posterboysocial.com (commit b8615e4 on `angie-social-portal`)
**Method:** demo-user login → curl every documented route with benign body → record status + first ~180 chars of response
**Verdict:** No new P1 bugs found. 3 already-known issues confirmed (Leonardo key missing). 2 cosmetic improvements suggested.

---

## Results table

| Method | Route | Status | Verdict |
|---|---|---|---|
| GET | `/api/account/locations-roll-up` | 401 | ✅ Expected (Prisma — demo has no accountId) |
| GET | `/api/calendar` | 401 | ✅ Expected (Prisma) |
| GET | `/api/feedback` | 200 | ✅ Returns existing feedback items |
| GET | `/api/knowledge` | 200 | ✅ Returns knowledge articles |
| GET | `/api/leonardo/status` | **500** | 🔴 LEONARDO_API_KEY missing (see env-audit) |
| GET | `/api/locations` | 401 | ✅ Expected (Prisma) |
| GET | `/api/meta/callback` | 307 | ✅ Redirects without OAuth code |
| GET | `/api/meta/insights` | 400 | ✅ "Not connected to Meta" — demo unconnected |
| GET | `/api/photos` | 401 | ✅ Expected (Prisma) |
| GET | `/api/posts` | 401 | ✅ Expected (Prisma) |
| GET | `/api/templates/catalog` | 200 | ✅ Returns 23 templates |
| GET | `/api/vimeo/videos` | 200 | ✅ Returns 1 video (VIMEO_ACCESS_TOKEN set) |
| POST | `/api/ai` | 200 | ✅ Claude responds (Angie Nichols brand baked in — see note below) |
| POST | `/api/enhance-prompt` | 200 | ✅ Fixed earlier today (gemini-2.5-flash) |
| POST | `/api/feedback` | 400 | ✅ "Message is required" — schema validation works |
| POST | `/api/generate-image` | 200 | ✅ Returns 1.8MB PNG |
| POST | `/api/knowledge` | 400 | ✅ "Title, category, and content are required" |
| POST | `/api/leonardo/edit` | **500** | 🔴 LEONARDO_API_KEY missing |
| POST | `/api/leonardo/upload` | **500** | 🔴 LEONARDO_API_KEY missing |
| POST | `/api/locations` | 401 | ✅ Expected (Prisma) |
| POST | `/api/meta/publish` | 400 | ✅ "locationId is required" — demo unconnected |
| POST | `/api/onboarding` | 400 | ⚠ "Invalid messages" — see Surprise #1 |
| POST | `/api/social-connections` | 401 | ✅ Expected (Prisma) |
| POST | `/api/upload` | **500** | ⚠ Generic 500 on empty body — see Surprise #2 |

**Untested (need real IDs, or destructive):** all `/api/locations/[id]/*`, all `/api/posts/[id]/*`, `/api/feedback DELETE`, `/api/knowledge DELETE`, `/api/locations/[id]/members/[userId] DELETE`, `/api/auth/signup` (covered in earlier smoke).

---

## P1 issues confirmed (3 — all the same root cause)

`/api/leonardo/{status,edit,upload}` all 500 with `"LEONARDO_API_KEY not configured"`. **One fix unblocks all three.** Already documented in `docs/env-audit.md` — set the env var on `angie-social-portal` + redeploy.

---

## Surprises worth flagging

### #1 — `/api/onboarding` POST is misleadingly named

It looks like a "submit onboarding answers" endpoint, but it actually expects an Anthropic chat-shaped `messages: [{role, content}, …]` array. It's the AI chat-with-assistant during the onboarding wizard, not a save-answers endpoint.

```ts
const { messages } = await req.json();
if (!Array.isArray(messages) || ...) {
  return Response.json({ error: "Invalid messages" }, { status: 400 });
}
```

**Verdict:** Not a bug — works as designed. **Suggestion:** post-beta, rename to `/api/onboarding-chat` (or `/api/ai/onboarding`) so future readers don't make my mistake.

### #2 — `/api/upload` returns generic 500 on missing file

The route uses `FormData` for multipart upload. Posting `{}` as JSON (or any body that doesn't include a `file` form field) crashes inside `formData.get("file")` and is caught by the outer try/catch → returns `500 "Upload failed"`.

```ts
const formData = await req.formData();
const file = formData.get("file") as File | null;
```

**Verdict:** Cosmetic — error handling could be sharper. Should return `400 "No file provided"` when `file` is null, reserving 500 for actual upload failures (S3 errors, etc.). **P3 follow-up.**

---

## Notable behaviors (working as designed, but worth knowing)

### `/api/ai` is grounded in Angie Nichols' brand

A "ping" message to the AI returns:

> "I'm here and ready to help you create compelling social media content for **Angie Nichols**. Whether you need a Facebook post, Instagram caption, market update…"

So the AI Assistant has the Angie brand book baked into its system prompt regardless of who's logged in. For closed beta this is fine (testers will see it's about real estate and understand). Post-beta the brand book on the AI system prompt needs to be dynamic — read from the user's actual `postpal-brand-book` localStorage.

### Prisma routes correctly 401 the demo user

The full Prisma-backed surface area (`/api/posts`, `/api/locations`, `/api/photos`, `/api/calendar`, `/api/account/locations-roll-up`, `/api/social-connections`) returns `401 Unauthorized` for the demo user. That's correct behavior — the demo session has no `accountId`. Real signups (via `/api/auth/signup`) get an `accountId` and these routes should work for them. **Not retested with a real signup tonight** (didn't want to create production user data); worth a manual smoke pass tomorrow once you're logged in.

### Knowledge base auto-serves realtor content

`GET /api/knowledge` returns articles like `"Real Estate Branding 101: 12 Strategies to Win Clients"`. This is the same realtor-locked knowledge corpus the wizard / AI uses. Generalization here belongs in the Day 3+ refactor.

---

## Beta-launch checklist (API)

- [ ] **🔴 Set `LEONARDO_API_KEY` on production** — unlocks 3 Studio routes simultaneously (see env-audit)
- [ ] 🟡 Manually smoke-test the 5 routes I couldn't reach (need a real signup + a real `locationId`):
  - `GET /api/locations/[id]`
  - `GET /api/locations/[id]/approval-rule`
  - `GET /api/locations/[id]/pending-approvals`
  - `POST /api/posts` (create a draft)
  - `POST /api/posts/[id]/submit-for-approval`
- [ ] 🟢 Post-beta: tighten `/api/upload` 500 → 400 for missing file
- [ ] 🟢 Post-beta: rename `/api/onboarding` → `/api/onboarding-chat` to match what it does
- [ ] 🟢 Post-beta: make `/api/ai` system prompt read the user's brand book, not Angie's
