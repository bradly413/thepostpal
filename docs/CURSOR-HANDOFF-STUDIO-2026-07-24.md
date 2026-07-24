# Cursor handoff — Posterboy Studio production pass

**Date:** 2026-07-24  
**For:** Cursor or another coding agent starting cold  
**Product:** Posterboy Social  
**Repo:** `/Users/bradnichols/Code/thepostpal-readable-v2`  
**Workspace symlink:** `/Users/bradnichols/Desktop/ventures/thepostpal`  
**Branch:** `feat/gpt-image-2-primary`  
**HEAD at handoff:** `ae12829` (`origin/main` was also `ae12829`)  
**Production:** https://www.posterboysocial.com/dashboard/studio

Read `CLAUDE.md`, `docs/ARCHITECTURE.md`, and
`docs/HANDOFF-STUDIO-GPT-IMAGE-2026-07-23.md` before changing Studio generation.
This document supersedes the old June session in `docs/CURSOR-HANDOFF.md` for
the current Studio work.

---

## Executive state

The latest Studio, Library, and Schedule improvements are **live in
production**, but the corresponding source changes are still **uncommitted in a
dirty working tree**.

Production deployment:

- Vercel deployment: `dpl_GcbF3HVLU43Z7QkEXfqbxvVsCjWN`
- Target: `production`
- State: `READY`
- Build URL:
  `https://angie-social-portal-h1ak2zhrf-bradly413s-projects.vercel.app`
- Confirmed aliases:
  - `https://posterboysocial.com`
  - `https://www.posterboysocial.com`
  - `https://thepostpal.com`
  - `https://www.thepostpal.com`

The production package was assembled from `HEAD` plus the intended working-tree
changes. It deliberately excluded local feedback tooling, agent files, relay
files, and demo experiments.

**Do not reset, clean, checkout, pull over, or broadly format this worktree.**
Check `git status` before every commit. Do not push unless Brad explicitly asks.

---

## What is now implemented

### 1. Video creation now follows the image-generation interaction model

The old narrow “AI VIDEO (VEO)” card and its duplicate internal prompt were
removed.

The current flow is:

1. Switch the bottom Studio composer to Video.
2. Enter one prompt in the same bottom input used for image generation.
3. Click **Create video**.
4. The existing async Veo path starts the job and polls for completion.
5. The main stage provides a wide video workspace for generated or uploaded
   clips.

The stage also supports:

- MP4/MOV drag-and-drop and keyboard-accessible file selection
- source preview and replacement
- trim-in and trim-out
- crop presets
- a text overlay
- export and use in post
- responsive desktop and mobile layouts
- reduced-motion handling

Primary files:

- `src/components/dashboard/composer/VideoComposer.tsx`
- `src/components/dashboard/composer/VideoComposer.module.css`
- `src/components/dashboard/studio/PosterboyStudio.tsx`
- `src/components/dashboard/studio/studio-styles.tsx`
- `e2e/studio.spec.ts`

The backend is intentionally still asynchronous:

- `POST /api/generate-video` starts Veo and returns a task ID.
- `GET /api/generate-video?taskId=...` polls the job.
- The UI hides that complexity so creation feels like the image flow.

### 2. Repeated image prompts request a genuinely fresh composition

Each fresh generation receives a server-generated variation key. The original
brief, facts, brand constraints, and required copy stay intact, while the
generation prompt receives a deterministic but per-request camera/composition/
lighting direction for photos or layout/hierarchy/accent direction for designs.

Primary files:

- `src/lib/studio/generation-variation.ts`
- `src/lib/studio/generation-variation.test.ts`
- `src/app/api/generate-image/route.ts`
- `src/app/api/generate-image/route.test.ts`
- `src/components/dashboard/studio/hooks/use-studio-generation.ts`

Do not replace this with client-only cache busting. The model must receive a
meaningfully different art direction while preserving user requirements.

### 3. “Enhance my prompt” now has observable outcomes

The endpoint now:

- trims and validates prompts
- returns `400` for invalid JSON
- treats tenant brand/geography grounding as helpful rather than fatal
- reports unchanged prompts explicitly
- falls back to Gemini when appropriate
- applies a 12-second Gemini timeout
- returns `503` when no enhancement provider is configured
- returns `504` when enhancement times out or fails

The Studio button exposes visible success/error feedback instead of appearing
dead.

Primary files:

- `src/app/api/enhance-prompt/route.ts`
- `src/app/api/enhance-prompt/route.test.ts`
- `src/components/dashboard/studio/PosterboyStudio.tsx`
- `e2e/studio.spec.ts`

### 4. Library can hand multiple images to Schedule

Image cards now have accessible checkboxes. A sticky selection bar allows the
user to clear the selection or schedule all selected images. Schedule receives
an ordered queue and staggers the images into separate posts.

Library also retains the single-item **Schedule** and PNG-download paths.

Primary files:

- `src/app/dashboard/photos/page.tsx`
- `src/lib/studio/schedule-handoff.ts`
- `src/lib/studio/schedule-handoff.test.ts`
- `e2e/photos.spec.ts`
- `e2e/library.spec.ts`

Multi-select currently applies to images. Do not silently broaden it to video
without deciding how mixed media should be scheduled.

### 5. Schedule media and caption controls are clearer

Schedule now:

- accepts a Library queue
- gives the media preview more usable responsive space
- tracks caption approval per queued item
- exposes **Approve** / **Approved**
- exposes **Regenerate** when a caption already exists
- clears approval when the user edits or regenerates a caption
- allows choosing an existing image or video from Library

Primary files:

- `src/app/dashboard/calendar/page.tsx`
- `src/components/dashboard/calendar/PostPreview.tsx`
- `src/lib/studio/schedule-handoff.ts`
- `e2e/library.spec.ts`

### 6. Conversation persistence is already committed at HEAD

Commit `ae12829` persists Studio conversations, images, and videos so the user
can reload and scroll through prior generations. Do not reimplement this as
local-only state. The current E2E coverage includes restoration after reload.

---

## Working-tree inventory

### Intended product/test changes

Tracked modifications:

```text
e2e/library.spec.ts
e2e/studio.spec.ts
src/app/api/enhance-prompt/route.ts
src/app/api/generate-image/route.test.ts
src/app/api/generate-image/route.ts
src/app/dashboard/calendar/page.tsx
src/app/dashboard/photos/page.tsx
src/components/dashboard/calendar/PostPreview.tsx
src/components/dashboard/composer/VideoComposer.tsx
src/components/dashboard/studio/PosterboyStudio.tsx
src/components/dashboard/studio/hooks/use-studio-generation.ts
src/components/dashboard/studio/studio-styles.tsx
src/lib/studio/schedule-handoff.ts
```

Untracked product/test files:

```text
e2e/photos.spec.ts
src/app/api/enhance-prompt/route.test.ts
src/components/dashboard/composer/VideoComposer.module.css
src/lib/studio/generation-variation.test.ts
src/lib/studio/generation-variation.ts
src/lib/studio/schedule-handoff.test.ts
```

### Local-only or unrelated files — preserve and exclude

These were **not** included in the production deployment:

```text
src/app/layout.tsx
.agents/
.refine-relay.json
.refine-relay.log
public/demo/
src/app/demo/
src/components/demo/
```

`src/app/layout.tsx` currently contains a development-only
`http://localhost:7331/inject.js` feedback script. Treat it as Brad’s local
tooling. Do not include it in a Studio commit or production package unless Brad
specifically requests that.

Do not use `git clean`, `git reset --hard`, or `git checkout --` on any of these
paths.

---

## Verification already completed

Before production deployment:

```bash
npx eslint \
  src/components/dashboard/composer/VideoComposer.tsx \
  e2e/studio.spec.ts

npx tsc --noEmit --incremental false

npx playwright test e2e/studio.spec.ts \
  --grep "shows prompt bar and disables create when empty|presents video creation as one responsive production workspace"

npm run build
```

Results:

- focused ESLint: passed
- TypeScript: passed
- focused Studio Playwright: 2 passed
- local production build: passed

Vercel then independently completed:

- dependency install and Prisma client generation
- production migration check: 21 found, none pending
- Next.js compile
- TypeScript
- 111/111 static pages
- production output deployment
- final `READY` state

The full Playwright suite and a real paid Veo generation were **not** run as part
of the final video-UI deploy. Do not claim those paths are verified. The existing
Veo start/poll API was preserved, but an authenticated, credit-consuming runtime
test remains a separate check.

The full repository lint may still report pre-existing React Compiler issues in
the large Studio component. Use focused lint plus TypeScript/build while
separating unrelated cleanup from this feature.

---

## First tasks for Cursor

1. Read this document and the three canonical docs listed at the top.
2. Run `git status --short --branch`; confirm branch and dirty paths before
   editing.
3. Do not overwrite the live production behavior with the old
   `docs/CURSOR-HANDOFF.md` state.
4. If asked to commit, stage only the intended product/test files listed above.
   Explicitly inspect `git diff --cached` before committing.
5. If asked to continue verification, prioritize:
   - all Studio E2E tests
   - Library multi-select to Schedule
   - Schedule Library picker with both image and video
   - caption approve/regenerate state across queued items
   - one authenticated Veo run, only with Brad’s approval because it consumes
     credits
6. If production looks stale, first hard-refresh and inspect deployment
   `dpl_GcbF3HVLU43Z7QkEXfqbxvVsCjWN`. Do not redeploy blindly.

Suggested validation commands:

```bash
npx tsc --noEmit --incremental false
npm test -- --run
npx playwright test e2e/studio.spec.ts e2e/library.spec.ts e2e/photos.spec.ts
npm run build
```

---

## Product constraints that must survive follow-up work

- No user-facing GPT/Gemini engine picker.
- Keep product/brand constraints intact when forcing fresh image variation.
- Image and video creation should feel like one system, even though Veo is an
  async job internally.
- The prompt composer must remain compact enough that generated media stays the
  visual focus.
- Prior generations and conversation history must remain scrollable and persist
  across reloads.
- Clicking a generated image must still open an enlarged preview.
- Honest provider fallback/status messages must remain visible.
- Do not reintroduce the tiny centered video card or a second Veo prompt.
- Preserve keyboard access, reduced motion, and mobile containment.
- Keep the warm-light Posterboy dashboard system; do not revive retired
  dark/gold dashboard styling.

---

## Paste-ready Cursor kickoff

> Read `docs/CURSOR-HANDOFF-STUDIO-2026-07-24.md` completely before touching
> code. Work in `/Users/bradnichols/Code/thepostpal-readable-v2` on
> `feat/gpt-image-2-primary`. The production changes are live but uncommitted.
> Preserve every dirty and untracked file, exclude the local feedback/demo paths
> listed in the handoff, and never reset or clean the tree. Reproduce and verify
> the requested behavior before editing. Do not commit, push, spend generation
> credits, or deploy unless Brad explicitly asks.
