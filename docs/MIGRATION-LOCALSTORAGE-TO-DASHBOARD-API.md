# Migration plan: legacy `*-store.ts` → `dashboard-api.ts`

**Date:** 2026-06-04 (for review)  
**Repo:** `~/Desktop/ventures/thepostpal/`  
**Status:** Plan only — **do not implement from this doc without explicit approval.**

**Context:** Production dashboard core (drafts, calendar posts/events, photos list, dispatch, home bento posts) already uses RLS-backed APIs via `src/lib/dashboard-api.ts`. Several pages still import **types or localStorage helpers** from `*-store.ts` files whose **CRUD paths are orphaned**. This plan focuses on **analytics**, **reports**, **editor**, and related surfaces called out in `docs/AGENT-HANDOFF-2026-06-03.md`, plus store cleanup.

---

## 1. Executive summary

| Category | Count | Action |
|----------|-------|--------|
| **Pages already on API** | Analytics, Reports, Dispatch, Drafts, Calendar (data), Facebook/IG (posts half) | Polish UX with `StateViews`; remove type imports from dead stores |
| **Pages still on localStorage** | Editor (photos), Issues (+ bento issue count), Organization, Brand-intake | Migrate to API; add missing routes where Prisma model exists |
| **Dead store CRUD** | `schedule-store.ts`, `events-store.ts` (functions) | Delete CRUD; relocate types |
| **Deprecated stub** | `meta-store.ts` | Delete after grep confirms zero imports |
| **Keep (non-dashboard)** | `auth-store.ts`, `knowledge-store.ts` (server), `feedback-store.ts` if still used | Out of scope for this migration |

**North star:** One client layer (`dashboard-api.ts` + small hooks), one view-model mapper module (`scheduled-post-mappers.ts` or successor), shared loading/error/empty UI (`StateViews.tsx` + `useActiveLocation()`).

---

## 2. `StateViews.tsx` — what it is and how to use it

**File:** `src/components/dashboard/StateViews.tsx`

**Role:** Presentational only. No data fetching, no stores. Calm editorial UI aligned with dashboard (“luxury editorial”: cream frame, gold retry accent, no spinners).

| Export | Purpose |
|--------|---------|
| `Skeleton` / `SkeletonText` / `SkeletonGrid` | Loading placeholders |
| `EmptyState` | Title + sub + optional action |
| `ErrorState` | Friendly error + optional `onRetry` |
| `NoLocationState` | No active workspace location |

**Current adoption:** Only **`/dashboard/photos`** uses the full pattern (loading → `SkeletonGrid`, error → `ErrorState`, no location → `NoLocationState`, empty → `EmptyState`).

**Target pattern for migrating pages** (mirror photos page):

```tsx
const { locationId, loading: locationLoading } = useActiveLocation();
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

if (locationLoading) return <SkeletonGrid />; // or SkeletonText rows for analytics
if (!locationId) return <NoLocationState onCreate={() => router.push("/dashboard/organization")} />;
if (loading) return <SkeletonGrid />; // or metric skeletons
if (error) return <ErrorState message={error} onRetry={load} />;
if (empty) return <EmptyState title="..." sub="..." />;
// ... happy path
```

**Do not** put fetch logic inside `StateViews`. Optional follow-up (separate PR): `DashboardPageStates` wrapper hook that composes `useActiveLocation` + load state — only if 4+ pages duplicate the same branch order.

---

## 3. Inventory: every `*-store.ts`

### 3.1 Dead CRUD — safe to strip after type extraction

#### `src/lib/schedule-store.ts`

| Item | Status |
|------|--------|
| `getScheduledPosts` / `addScheduledPost` / `updateScheduledPost` / `deleteScheduledPost` | **No imports in `src/app`** — dead |
| `ScheduledPost` interface | **Still used** as view-model type |

**Consumers of type only:**

- `src/lib/use-dashboard-scheduled-posts.ts` (data from API via `mapRecordToCalendarPost`)
- `src/app/dashboard/reports/page.tsx`
- `src/app/dashboard/facebook/page.tsx`, `instagram/page.tsx`
- `src/app/dashboard/calendar/page.tsx` (posts on grid; writes go to `dashboard-api`)
- `src/lib/scheduled-post-mappers.ts`

**Migration:** Move `ScheduledPost` (+ `CalendarPostPlatform` if needed) to `src/lib/dashboard-view-types.ts` (new) or export `CalendarPostView` from `scheduled-post-mappers.ts`. Update imports. **Delete** `schedule-store.ts`.

---

#### `src/lib/events-store.ts`

| Item | Status |
|------|--------|
| `getCalendarEvents` / `add*` / `update*` / `delete*` | **No app imports** — dead |
| `CalendarEvent` interface | **Used** by calendar page as UI shape |

**Migration:** Move `CalendarEvent` to `dashboard-view-types.ts` or keep adapter `recordToEvent()` in calendar page and export type from there. Calendar **already persists** via `fetchDashboardCalendar` / `createDashboardCalendarEvent` / etc. **Delete** `events-store.ts` after type move.

---

### 3.2 Active localStorage — in scope for migration

#### `src/lib/photo-store.ts`

| Item | Status |
|------|--------|
| `BRAND_PHOTOS` | Static `/public/brand/*` URLs — **keep** (move to `src/lib/brand-photo-assets.ts` or constants file, not localStorage) |
| `getUserPhotos` / `saveUserPhoto` / `removeUserPhoto` | **Editor only** — `user-photos` localStorage key |

**Consumers:**

- **`/dashboard/editor/[templateId]`** — primary blocker: drop handler saves data URLs to localStorage; picker merges `BRAND_PHOTOS` + `getUserPhotos()`
- **`/dashboard/photos`** — imports `BRAND_PHOTOS` only; uploads use `/api/upload` + `createDashboardPhoto` ✅

**Target:** Editor uses same pipeline as photos page: `uploadFile` → `createDashboardPhoto` → `fetchDashboardPhotos(locationId)`. Thumbnails from API; optional static brand strip unchanged.

---

#### `src/lib/drafts-store.ts`

| Item | Status |
|------|--------|
| Full localStorage CRUD | **Orphaned** for UI — drafts page uses `/api/posts` |
| `canTransition` | **Unit tested** — move to `src/lib/draft-status.ts` (pure) |
| `seedDemoDrafts` | Likely unused — verify grep then delete |
| Used by | `issues-store.ts` only |

**Migration:** Issues migration (below) removes dependency. Keep `canTransition` in shared lib; delete drafts-store after issues API exists.

---

#### `src/lib/issues-store.ts`

| Item | Status |
|------|--------|
| localStorage `posterboy-issues` | **Active** |
| Depends on | `drafts-store`, `organization-store` |

**Consumers:**

- `/dashboard/issues`
- `DashboardBento` (`getIssues`, `seedDemoIssues`)

**Prisma:** `Issue` model exists (`prisma/schema.prisma`) with relations to `Draft` / `ScheduledPost` — **no `/api/issues` yet**.

**Migration:** New API + client methods (Phase 2). Until then, issues remain legacy.

---

#### `src/lib/organization-store.ts`

| Item | Status |
|------|--------|
| localStorage org/locations/active location | **Active** |

**Consumers:** `/dashboard/organization`, `brand-intake`, `dashboard-data-init`, `issues-store`, `onboarding-brand-sync` (shim)

**Overlap:** `fetchDashboardLocations()` + `dashboard-browser-state.ts` already cover real tenants. Org page still mutates fake local IDs.

**Migration:** Phase 3 — org page reads/writes `/api/locations` only; delete demo seed paths for prod users; keep `ensureDashboardData` as API-first (already partially done).

---

#### `src/lib/meta-store.ts`

Deprecated no-op stub. **Delete** in cleanup PR after confirming no imports (only self-references).

---

### 3.3 Out of scope (do not delete in this program)

| File | Reason |
|------|--------|
| `auth-store.ts` | Signup/session backing store (Upstash/local) |
| `knowledge-store.ts` | Used by `/api/knowledge` server-side |
| `feedback-store.ts` | Verify usage; likely separate API migration |

---

## 4. Page-by-page analysis

### 4.1 Analytics — `/dashboard/analytics`

**Current state:** ✅ **Already migrated**

- Loads `fetchDashboardPosts` + `filterPostsForLocation` / `countPostsByStatus` from `dashboard-post-helpers.ts`
- `LocationSwitcher` + `onStoredActiveLocationChange`
- Error: inline `<p className="text-danger">` only — **no `StateViews`**

**Remaining work (P1 polish, ~1–2 hrs):**

1. Import `SkeletonText`, `ErrorState`, `NoLocationState` from `StateViews`
2. Use `useActiveLocation()` instead of manual `getStoredActiveLocationId` only
3. Metric cards: 6× `SkeletonText` while loading
4. Replace inline error with `ErrorState` + `onRetry={load}`

**No new API routes required.**

---

### 4.2 Reports — `/dashboard/reports`

**Current state:** ✅ **Data from API** via `useDashboardScheduledPosts()` → `fetchDashboardPosts` → `mapRecordToCalendarPost`

**Legacy tie:** Imports `ScheduledPost` type from **`schedule-store.ts`** (not localStorage reads).

**Remaining work (P1, ~2–3 hrs):**

1. After type extraction (§3.1), update import to `dashboard-view-types.ts`
2. Add `StateViews`: loading skeleton for 3 stat cards + sections; `ErrorState` with `reload` from hook
3. Optional: rename hook to `useDashboardPostsView()` returning `DashboardPostRecord[]` + mapper at boundary — clearer than “scheduled” naming
4. Align status filters with `DraftStatus` from API (`approved` vs `scheduled` — reports currently counts `scheduled`/`published`/`draft` only; document mapping in mapper table below)

**Status mapping note** (for QA):

| API `DraftStatus` | Reports bucket today |
|-------------------|----------------------|
| `scheduled`, `approved` | `scheduled` (via mapper `approved` → `scheduled`) |
| `published` | `published` |
| `draft`, `needs_review`, `needs_revision` | `draft` |

---

### 4.3 Dispatch — `/dashboard/dispatch`

**Current state:** ✅ **API-backed** (`fetchDashboardPosts`, `useActiveLocation`)

**Gap:** Custom `pb-empty` instead of `EmptyState`; inline error only.

**Remaining work (P1, ~1 hr):** Adopt `ErrorState` / `EmptyState` / loading skeleton for week grid.

**No store deletion dependency.**

---

### 4.4 Facebook / Instagram — `/dashboard/facebook`, `/dashboard/instagram`

**Current state:** **Hybrid**

| Data | Source |
|------|--------|
| Scheduled/post list | `useDashboardScheduledPosts()` → API ✅ |
| Page/profile insights, media | `GET /api/meta/insights?locationId=` ✅ |
| Meta connection | `useMetaConnection()` → `/api/social-connections/meta` ✅ |

**Legacy tie:** `ScheduledPost` type from `schedule-store.ts` only.

**Remaining work (P1, ~2 hrs each or combined):**

1. Type import cleanup (§3.1)
2. `StateViews` for: not connected (`EmptyState` + link to settings), insights loading, insights error
3. Split loading: posts hook `loading` vs insights `loading` (today single `loading` ends when insights finish — can show posts before insights)

**No new API required** unless you want persisted “last insights snapshot” in DB (optional P3).

---

### 4.5 Editor — `/dashboard/editor/[templateId]` (**primary localStorage debt**)

**Current state:** **Mixed**

| Feature | Source |
|---------|--------|
| Schedule/publish post | `createDashboardPost` + mappers ✅ |
| Meta publish | `useMetaConnection` + `/api/meta/publish` ✅ |
| Template catalog | `/api/templates/catalog` ✅ |
| Photo upload to template | **FileReader → data URL → `saveUserPhoto(localStorage)`** ❌ |
| Photo picker modal | `getUserPhotos()` + `BRAND_PHOTOS` ❌ |

**Problems in production:**

- User uploads on editor **do not appear** on `/dashboard/photos` for other devices/sessions
- Data URLs in localStorage blow quota and vanish on new browser
- Without S3, `/api/upload` may return ephemeral URLs — **still better** than localStorage because `PhotoAsset` row persists in Postgres

**Migration steps (P0 for editor, ~4–6 hrs):**

1. **Extract shared upload helper** from `photos/page.tsx`:
   - `src/lib/dashboard-upload.ts`: `uploadDashboardImage(file): Promise<string>` (wraps `/api/upload` + data URL fallback)
2. **Add hook** `useDashboardPhotos(locationId)` in `src/lib/use-dashboard-photos.ts`:
   - Wraps `fetchDashboardPhotos` / `createDashboardPhoto` / `deleteDashboardPhoto`
   - Returns `{ photos: DisplayPhoto[], loading, error, reload, uploadAndCreate }`
3. **Editor `handlePhoto`:**
   - `const url = await uploadDashboardImage(file)`
   - `await createDashboardPhoto({ locationId, url, alt: file.name })`
   - `setPhoto(url)` (prefer HTTPS URL over data URL for publish path)
   - Remove `saveUserPhoto` / `setPhotosTick`
4. **Picker UI:** `fetchDashboardPhotos` + static `BRAND_PHOTOS` (or org brand kit URLs later)
5. **`useActiveLocation()`** — require `locationId` before schedule/publish; show `NoLocationState` if missing
6. **`StateViews`** on initial template load failure (optional `ErrorState` if catalog fetch fails)

**Extend `dashboard-api.ts`:** No new endpoints if existing photo CRUD suffices. Ensure `createDashboardPhoto` accepts URLs from `/api/upload`.

**Delete after editor migration:** `getUserPhotos`, `saveUserPhoto`, `removeUserPhoto` from `photo-store.ts`; keep `BRAND_PHOTOS` in constants module.

---

## 5. Target architecture

```mermaid
flowchart LR
  subgraph pages [Dashboard pages]
    AN[analytics]
    RP[reports]
    ED[editor]
    FB[facebook/instagram]
  end

  subgraph hooks [Client hooks]
    UAL[useActiveLocation]
    UDP[useDashboardPostsView]
    UDPH[useDashboardPhotos]
    UMC[useMetaConnection]
  end

  subgraph client [dashboard-api.ts]
    POSTS[/api/posts]
    PHOTOS[/api/photos]
    CAL[/api/calendar]
    META[/api/social-connections/meta]
  end

  subgraph ui [StateViews.tsx]
    SK[Skeleton*]
    ES[Empty/Error/NoLocation]
  end

  AN --> UAL --> POSTS
  RP --> UDP --> POSTS
  ED --> UDPH --> PHOTOS
  ED --> POSTS
  FB --> UDP --> POSTS
  FB --> UMC --> META

  AN --> ui
  RP --> ui
  ED --> ui
```

### 5.1 Proposed new / moved modules (no implementation yet)

| Module | Responsibility |
|--------|----------------|
| `src/lib/dashboard-view-types.ts` | `CalendarPostView` (ex-`ScheduledPost`), `CalendarEventView` (ex-`CalendarEvent`) |
| `src/lib/draft-status.ts` | `canTransition()` from drafts-store |
| `src/lib/dashboard-upload.ts` | Shared file → URL upload |
| `src/lib/use-dashboard-photos.ts` | Photos CRUD hook |
| `src/lib/brand-photo-assets.ts` | `BRAND_PHOTOS` static list |

### 5.2 `dashboard-api.ts` extensions (later phases)

| Method | When | Prisma |
|--------|------|--------|
| `fetchDashboardIssues` / `createDashboardIssue` / … | Phase 2 | `Issue` exists |
| `fetchDashboardMe` wrapper | Optional | `/api/me` already exists — hook only |

Do **not** fork fetch patterns per page; extend the existing `apiRequest` helper.

---

## 6. Phased rollout

### Phase 0 — Type hygiene + zero behavior change (½ day)

**Goal:** Remove dead localStorage CRUD without touching UX.

- [ ] Create `dashboard-view-types.ts`; move interfaces from schedule/events stores
- [ ] Update all imports (mappers, hooks, calendar, reports, FB, IG)
- [ ] Move `canTransition` → `draft-status.ts`; fix test import
- [ ] Delete `schedule-store.ts`, `events-store.ts`
- [ ] Grep for `postpal-scheduled-posts`, `postpal-calendar-events` keys — document “legacy keys orphaned in browser” in release notes
- [ ] Delete `meta-store.ts` if unused

**Verify:** `npx tsc --noEmit`, `npm run build`, `./scripts/smoke-prod.sh`

---

### Phase 1 — Analytics, reports, dispatch, FB/IG polish (1 day)

**Goal:** Consistent loading/error/empty UX; no localStorage.

- [ ] Adopt `StateViews` on analytics, reports, dispatch, facebook, instagram
- [ ] Standardize on `useActiveLocation()` where still using raw `getStoredActiveLocationId`
- [ ] Optional: export `useDashboardPostsView` alias wrapping existing scheduled-posts hook

**Verify:** Manual click-through on prod/staging per `docs/PLAN-2026-06-04.md` P0 UI checklist

---

### Phase 2 — Editor photo pipeline (1 day) **highest user impact**

**Goal:** Editor uploads = same as photos library (Postgres + upload URL).

- [ ] `dashboard-upload.ts` + `use-dashboard-photos.ts`
- [ ] Refactor editor to use hook; remove photo-store mutations
- [ ] Split `BRAND_PHOTOS` to constants file
- [ ] `StateViews` / `NoLocationState` when no `locationId`
- [ ] Confirm publish flow uses public URL when S3 configured (`docs/PROD-ENV-CHECKLIST.md`)

**Verify:** Upload in editor → appears on photos page after reload; schedule post still creates `/api/posts` row

---

### Phase 3 — Issues + bento (2–3 days)

**Goal:** Replace `issues-store` + `drafts-store` dependency.

**Backend (new):**

- [ ] `GET/POST /api/issues`, `GET/PUT/DELETE /api/issues/[id]` (tenant + location scoped)
- [ ] Link issue ↔ posts via join or `draftIds` JSON matching existing client shape
- [ ] RLS policies for `Issue` table (verify in `deploy-prod-db.sh` flow)

**Client:**

- [ ] `fetchDashboardIssues`, etc. in `dashboard-api.ts`
- [ ] `useDashboardIssues()` hook
- [ ] Migrate `/dashboard/issues` + `DashboardBento` issue count
- [ ] Remove `seedDemoIssues` for authenticated users (demo tenant only via server seed if needed)

**Delete:** `issues-store.ts`, `drafts-store.ts` (after moving `canTransition`)

---

### Phase 4 — Organization store removal (2+ days)

**Goal:** Single location source of truth.

- [ ] Rewrite `/dashboard/organization` to `fetchDashboardLocations` + location CRUD APIs
- [ ] Remove `posterboy-organization` / `posterboy-locations` localStorage keys
- [ ] `brand-intake` → POST locations or onboarding provision only
- [ ] Simplify `dashboard-data-init.ts` — no `seedDemoOrganization` on prod paths

**Delete:** `organization-store.ts` when grep clean

---

## 7. Deletion checklist (final gate)

Only delete when **grep is zero** and smoke passes:

| File | Gate |
|------|------|
| `schedule-store.ts` | Phase 0 |
| `events-store.ts` | Phase 0 |
| `meta-store.ts` | Phase 0 |
| `photo-store.ts` (mutators) | Phase 2 — keep or relocate `BRAND_PHOTOS` |
| `drafts-store.ts` | Phase 3 |
| `issues-store.ts` | Phase 3 |
| `organization-store.ts` | Phase 4 |

---

## 8. Testing matrix

| Scenario | Pages |
|----------|--------|
| Solo tenant, 1 location | Analytics, reports, editor upload, schedule from editor |
| Command tenant, 2+ locations | Location switcher refreshes posts/photos |
| Fresh signup | No localStorage seed; editor requires location |
| RLS isolation | User A posts not visible to User B (smoke script + manual) |
| Meta disconnected | FB/IG `EmptyState` with link to settings |
| Upload without S3 | Photo row persists; URL may be ephemeral until P1 env |

---

## 9. Risks and decisions for Brad

| Decision | Options | Recommendation |
|----------|---------|----------------|
| View-model types | Keep mapper returning legacy `ScheduledPost` shape vs rename to `CalendarPostView` | Rename in Phase 0 — reduces confusion with Prisma `ScheduledPost` model |
| Reports status buckets | Keep simplified 3-state vs expose full `DraftStatus` | Keep 3-state for UX; document mapper |
| Demo issues seed | Client seed vs server-side demo tenant | Server-only for `demo` user after Phase 3 |
| Editor data URL fallback | Allow temporarily vs block until upload succeeds | Allow fallback but always POST `PhotoAsset` row |
| Issues API shape | Mirror localStorage `Issue` vs RESTful minimal | Mirror existing UI first, refactor later |

---

## 10. Suggested order tomorrow

1. **Read** this doc + skim `photos/page.tsx` (reference implementation)  
2. **Phase 0** PR — type extraction + delete dead stores (low risk)  
3. **Phase 2** PR — editor photos (highest prod pain)  
4. **Phase 1** PR — `StateViews` polish on analytics/reports/social  
5. Schedule **Phase 3–4** after P0 UI validation in `docs/PLAN-2026-06-04.md`

---

## Appendix A — `dashboard-api.ts` coverage today

Already implemented: locations, posts (+ approval actions), photos, calendar, meta connection, brand book.

**Not implemented:** issues, organization CRUD (partially via `/api/locations`), analytics aggregates (page computes client-side — acceptable for now).

## Appendix B — Files to touch (by phase)

**Phase 0:** `schedule-store.ts`, `events-store.ts`, `scheduled-post-mappers.ts`, `use-dashboard-scheduled-posts.ts`, `calendar/page.tsx`, `reports/page.tsx`, `facebook/page.tsx`, `instagram/page.tsx`, `drafts-store.test.ts` → `draft-status.test.ts`

**Phase 1:** `analytics/page.tsx`, `reports/page.tsx`, `dispatch/page.tsx`, `facebook/page.tsx`, `instagram/page.tsx`

**Phase 2:** `editor/[templateId]/page.tsx`, new `dashboard-upload.ts`, `use-dashboard-photos.ts`, `photo-store.ts` removal, optional `brand-photo-assets.ts`

**Phase 3:** new `api/issues/*`, `dashboard-api.ts`, `issues/page.tsx`, `DashboardBento.tsx`

**Phase 4:** `organization/page.tsx`, `dashboard-data-init.ts`, `onboarding-brand-sync.ts`, `brand-intake/page.tsx`
