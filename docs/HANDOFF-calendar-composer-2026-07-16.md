# Handoff — Calendar + Composer redesign (2026-07-16)

Claude → Cursor. All work below is **uncommitted on `main`** in this working tree, verified (tsc + 112 tests + `next build` + driven in the browser). Nothing is pushed. Pick up from here.

## What this is
A Sleck/Nija-Works–style rebuild of `/dashboard/calendar`: thumbnail calendar on the right, an inline composer on the left (was a modal), and a live post preview. Built over ~8 iterative passes with Brad.

## Files changed (5)
| File | Change |
|------|--------|
| `src/app/dashboard/calendar/page.tsx` | The big one (+394/−116). Inline composer replaces the "Schedule Post" modal; thumbnail month/week cells; fixed-pane no-scroll; auto-generate caption options; Sleck composer (account row + channel toggles, Post tab, preview, "Rewrite With AI", bottom schedule bar with split Schedule/▾ button). |
| `src/components/dashboard/calendar/PostPreview.tsx` | **NEW** — Instagram/Facebook post mock (avatar, handle, action icons, caption). Image uses `object-contain max-h-[400px]` so the **whole image shows** (do not revert to object-cover — Brad explicitly wanted full image). |
| `src/components/dashboard/home/dashboard-home-styles.tsx` | `.home2` grid sidebar column `250px`→`auto` (sizes to actual sidebar width); `.pb-home2--fixed` block = fixed app-pane (no page scroll) for the calendar route, calendar scrolls internally. |
| `src/components/DashboardShell.tsx` | Adds `pb-home2--fixed` class on `/dashboard/calendar` only. |
| `src/app/api/ai/captions-from-image/route.ts` | Prompt fix: handle BOTH designed-graphics-with-text AND plain photos (was over-asserting on-image text; caused refusals/502s on plain photos). This endpoint is also used by the bulk scheduler in prod, so this is a real prod fix. |

Sidebar auto-collapse to icon rail on the calendar route lives in `src/components/dashboard/AppSidebar.tsx` — **already committed/shipped** in `12db13d`, not in this batch.

## How the composer works (reuses all existing handlers)
- **Channel toggles** (FB/IG glyphs in the account row) drive `formPlatform` via `togglePlatformChannel()`. PostPreview shows FB card only when FB is the sole channel, else IG.
- **"Rewrite With AI"** → `generateCaptionOptions()` → `POST /api/ai/captions-from-image` (retries once; renders 3 pickable options; scrolls them into view). Requires an image + `ANTHROPIC_API_KEY`. Note: the model **correctly refuses off-brand images** (returns prose → 502 → generic "Couldn't generate options"). Not a bug. Nice future polish: surface the model's actual guidance instead of the generic error.
- **Bottom bar**: inline schedule time (`formatComposerSchedule`) opens date/time picker; split button — primary = `handleSavePost(true)` (schedule & approve → cron queue), ▾ dropdown = Publish now / Save as draft / Delete. Draft path uses `setTimeout(…,0)` after `setFormStatus("draft")` to avoid the state-flush race.
- Post status convention unchanged: `approved` = internal cron queue; never write `scheduled` for new posts (see CLAUDE.md).

## Known trade-offs / open items (Brad-aware)
1. **Schedule button below the fold** on short laptops now that the full image shows. Options if it bothers you: adaptive image height, or make the bottom bar a sticky footer.
2. **IG channel glyph** is the standard camera outline (not the exact IG gradient logo). FB glyph is the real "f".
3. **No Story tabs** — only a "Post" tab, since Posterboy doesn't publish Stories. Add when Stories exist.
4. Off-brand-refusal error copy (see above).

## Run + verify locally
- Dev server: `preview_start` name `next-dev` (port 8240) — or `cd ~/Desktop/ventures/thepostpal && export $(grep -h '^DATABASE_URL=' .env.local | sed 's/"//g') && npm run dev`. **Do not** run a sandboxed `next dev` (drops `.next/server`).
- Login: demo / demo123 → Demo Workspace (`demo-org`, local dev DB `posterboy_rls_dev`).
- Local demo tenant brand = "Maple & Main Café & Bakery" — use café/food images to test AI captions (off-brand images get refused, correctly).
- Verify: `npx tsc --noEmit && npm run test && npm run build`. All currently green.

## DEPLOY — read before shipping
1. **No DB migration in this batch** (no `schema.prisma` change) — safe to push directly.
2. **⚠️ Auto-deploy is currently broken.** As of 2026-07-15 a `git push` to `main` did NOT trigger a Vercel deploy on either `angie-social-portal` or the orphan `thepostpal-readable-v2`. Fallback that works: `npx vercel deploy --prod --scope bradly413s-projects --yes` from repo root (linked to `angie-social-portal` via `.vercel/project.json`). **Someone should reconnect the GitHub→Vercel integration in the Vercel dashboard** — main is supposed to auto-deploy.
3. After deploy: `./scripts/smoke-prod.sh` (12 checks) and `.claude/skills/launch-check/scripts/launch-check.sh`.
4. Prod Neon direct URL for any DB work: `npx neonctl connection-string --project-id shiny-sky-49937641` (CLI authed on Brad's Mac).

## Shared-tree hazard (important)
Cursor and Claude share this one working checkout (`~/Desktop/ventures/thepostpal` is a symlink to `~/Code/thepostpal-readable-v2`). Earlier this session a `git stash -u` + branch switch in one tool wiped the other's uncommitted WIP, and an early push deployed a migration-dependent commit before its migration (27h cron outage). **Commit this batch soon** so it's safe. Check `git branch --show-current` and `git status` before destructive git ops.

## Suggested commit message
```
feat(calendar): Sleck composer — inline post editor beside thumbnail calendar

- Composer moved from modal to an inline left panel: account row + FB/IG
  channel toggles, Post tab, live PostPreview (IG/FB), caption with
  "Rewrite With AI" (vision caption options), and a bottom schedule bar
  (inline time + split Schedule/dropdown: publish now / draft / delete).
- Calendar is a fixed pane (no page scroll; calendar scrolls internally);
  .home2 sidebar column sizes to the actual sidebar width.
- PostPreview shows the whole image (object-contain), platform-accurate chrome.
- captions-from-image prompt handles plain photos + designed graphics
  (fixes off-brand/plain-photo 502s; bulk scheduler benefits too).
```
