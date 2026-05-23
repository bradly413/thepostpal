# Prisma wire-up estimate — drafts vertical first

**Generated:** 2026-05-23 (overnight Day-2 prep, Task H — read-only sizing)
**Scope:** swap `src/lib/drafts-store.ts` (localStorage) → server endpoints backed by Prisma's `Draft` model. Sized for after beta.
**No code changes in this doc.** Just a sized scope so we know what we're signing up for.

---

## TL;DR sizing

| Slice | Size | Approx. dev time | Why |
|---|---|---|---|
| **Drafts vertical only** (drafts-store → Prisma) | **M** | 1–2 days | Schema exists; route handlers exist for `Post` but not `Draft`; ~13 store functions to swap; demo-user accountId issue must be solved |
| **All localStorage stores** (drafts + issues + photos + knowledge + organization + events + schedule + feedback) | **L** | 5–7 days | Same pattern × 8 vertical surfaces; cross-cutting auth and demo-user handling |
| **Add to it: real durable auth-store (Upstash)** | +1 day | | Out of scope today but blocks "real signup" durability |
| **Add to it: Meta publish actually pushes to FB/IG** | +1–2 days | | Out of scope, separate from Prisma wire-up |

Recommend doing **drafts vertical first**, as a vertical slice that proves the pattern. After it lands, the other 7 stores follow the same recipe and can be parallelized or sequenced.

---

## What's already in place (good news)

1. **Prisma schema is ready.** `prisma/schema.prisma` has all the models: `Organization`, `User`, `Location`, `LocationMembership`, `Draft`, `Post`, `Issue`, `Approval`, `ApprovalRule`, `BrandKit`, `BrandVoiceProfile`, `SocialConnection`, `ScheduledPost`, `PhotoAsset`, `CalendarEvent`, `KnowledgeBaseEntry`, `Template`, `DispatchItem`, `Campaign`, `CampaignLocation`, `MediaAsset`, `AnalyticsSnapshot`, `Subscription`. 31 models total.

2. **`Draft` model shape ≈ localStorage `Draft` type.** Field-for-field comparison:

   | localStorage `Draft` | Prisma `Draft` | Notes |
   |---|---|---|
   | `id: string` | `id: String @id @default(cuid())` | cuid vs my-local-id, conversion at boundary |
   | `locationId: string` | `locationId: String` | ✅ same |
   | `copy: string` | `copy: String` | ✅ same |
   | `platforms: SocialPlatform[]` | `platforms: SocialPlatform[]` | ✅ same (enum) |
   | `scheduledDate?: string` | `scheduledDate: DateTime?` | string ISO ↔ Date conversion |
   | `scheduledTime?: string` | `scheduledTime: String?` | ✅ same |
   | `status: DraftStatus` | `status: DraftStatus @default(draft)` | ✅ same (enum) |
   | `reviewerNotes?: string` | `reviewerNotes: String?` | ✅ same |
   | `createdAt: string` | `createdAt: DateTime @default(now())` | string ↔ Date |
   | `updatedAt: string` | `updatedAt: DateTime @updatedAt` | string ↔ Date |
   | — | `issueId?: String` | NEW relation (drafts can belong to a weekly issue) |
   | — | `note?: String` | New |
   | — | `approvals[], mediaAssets[], scheduledPosts[]` | NEW relations |

   No data migration needed — beta drafts are still localStorage; the Prisma side starts empty.

3. **Auth pattern is set.** `requireAuthContext()` in `src/lib/api-auth.ts` reads the JWT, gives `{ userId, organizationId }`. All existing Prisma routes use it.

4. **`db` client wrapped.** `src/lib/db.ts` exposes a singleton Prisma client.

5. **Approval state machine exists.** `src/lib/approval-state-machine.ts` already encodes the draft status transitions (matches `VALID_TRANSITIONS` in drafts-store.ts:10).

---

## What's missing (the work)

### 1) No `/api/drafts` route — only `/api/posts`

Currently `/api/posts` is wired to `db.scheduledPost`, which is a separate Prisma model representing "queued to publish." `Draft` (workflow state) needs its own endpoint set:

```
GET    /api/drafts?locationId=…           list drafts for a location
GET    /api/drafts?status=needs_review    filtered list
POST   /api/drafts                        create draft
GET    /api/drafts/[id]                   single draft
PATCH  /api/drafts/[id]                   update fields
DELETE /api/drafts/[id]                   delete draft
POST   /api/drafts/[id]/transition        guarded status transition
POST   /api/drafts/approve-all            bulk approve (locationId scope)
```

That's ~6 route files. Estimated ~250–350 lines total (mostly auth + access checks + Prisma calls).

### 2) `drafts-store.ts` needs to be replaced

Two patterns to choose between:

**A. Server-thunk pattern (recommended)** — keep `drafts-store.ts` as the API surface; rewrite internals to call `fetch('/api/drafts/...')`. Pages stay nearly identical.

```ts
// before
export function getDrafts(): Draft[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// after
export async function getDrafts(locationId: string): Promise<Draft[]> {
  const r = await fetch(`/api/drafts?locationId=${encodeURIComponent(locationId)}`);
  if (!r.ok) return [];
  const { drafts } = await r.json();
  return drafts;
}
```

Cost: 13 functions × ~5–8 lines each. **~80–110 lines.**

Pages need to handle `Promise<Draft[]>` instead of synchronous returns — adds `useEffect` + `useState` patterns. Currently `dashboard/drafts/page.tsx` already uses `useState`/`useEffect`/`load()`; the changes are mostly mechanical.

**B. React Query / SWR pattern** — drop `drafts-store.ts` entirely, hooks like `useDrafts(locationId)` per page. Cleaner long-term, more upfront refactor.

Recommend A for minimum-scope first cut; can migrate to B later if it pays off.

### 3) Demo user accountId problem (the real blocker)

The demo session in `src/lib/auth.ts` is a JWT-only login. It has no `accountId` / `organizationId` / `locationId`. Currently this means every Prisma route 401s the demo user (confirmed in `docs/api-smoke-results.md`).

Three ways to handle:

1. **Seed a demo Org + Location into Prisma at signup time.** When `username === 'demo'` logs in, ensure a demo Organization with a demo Location exists in the DB, and the JWT payload includes both IDs. Demo session now works through Prisma. Cleanest. ~50 lines.

2. **Maintain a localStorage fallback path on the client when 401 received.** drafts-store.ts tries Prisma; on 401 falls back to localStorage. Lets us keep the demo path on the existing local data. Easy. ~30 lines. Smells.

3. **Replace demo login with "guest signup" flow.** Every "demo" click actually creates a real ephemeral user with auto-cleanup. Cleanest UX, most work. ~150 lines.

Recommend **#1 for beta** — quick, clean, no special-cased data paths.

### 4) Status transition / state machine reconciliation

`drafts-store.ts:VALID_TRANSITIONS` and `src/lib/approval-state-machine.ts` both encode draft state. They should agree. Audit + unify before swapping.

### 5) Event-bus replacement

`drafts-store.ts:saveDrafts` dispatches `window.dispatchEvent(new Event("drafts-updated"))` so the dashboard re-renders. After the swap, mutations happen server-side; the client needs a way to know to refetch. Options:
- Polling (poll every N seconds when page focused) — simplest
- Optimistic updates — refetch after each successful mutation in the page
- Server-Sent Events / websockets — overkill
- Pages just call `load()` after their own mutations — already the pattern; works

The custom event is mostly for cross-tab sync (one tab presses a draft, another tab updates). Probably skip cross-tab for v1; document the loss.

---

## Phased rollout plan (suggested)

| Phase | Deliverable | Days |
|---|---|---|
| **0** | Seed demo Org + Location into Prisma on demo login; add `accountId` / `organizationId` / `locationId` to JWT payload. Verify demo session can hit `/api/posts` without 401. | 0.5 |
| **1** | Build the `/api/drafts/*` route family. Test via curl against the seeded demo. | 0.5 |
| **2** | Rewrite `src/lib/drafts-store.ts` internals to call the API. Convert sync → async. Update `dashboard/drafts/page.tsx`, `dashboard/dispatch/page.tsx`, and any other consumers. | 0.5 |
| **3** | Reconcile state machine + drop localStorage events. Manual QA: create / press / approve / skip / schedule a draft as the demo user and as a real signup. | 0.25 |
| **4** | Migrate the next vertical store using the same recipe. Iterate. | 0.25 each, ×7 = ~1.75 |

**Drafts vertical alone:** ~1.75 days (Phases 0–3).
**Full localStorage → Prisma sweep:** ~3.5 days (Phases 0–4).

---

## What this doesn't cover (call out explicitly)

These are adjacent but separate threads — don't conflate with the Prisma swap:

- **Real Meta publish.** `/api/meta/publish` exists but currently marks as published in localStorage without pushing to Facebook/Instagram. Wiring real publish needs OAuth + public image URLs (S3/Cloudinary) per the CLAUDE.md TODO.
- **Auth-store durability.** Currently /tmp fallback (see env-audit). Should resolve before the Prisma swap so real signups have durable sessions.
- **Brand book persistence.** Currently localStorage `postpal-brand-book`. Prisma has `BrandKit` + `BrandVoiceProfile`. Separate slice.
- **Knowledge base** is currently realtor-locked content. Generalization belongs in the Day 3+ onboarding refactor, not here.

---

## Open questions for after-beta planning

1. **One Org per user, or share Orgs across teammates?** Schema supports multi-user Orgs (`LocationMembership` relation), but onboarding currently treats users as solo. Beta-test feedback may push this either way.
2. **Real-time updates needed?** If yes, server-sent events or polling. If "good enough on refresh," skip.
3. **Offline support?** localStorage gives that for free; full server gives none. May want a small offline cache layer.
4. **Drafts vs Issues vs ScheduledPost — when does each get created?** Worth sketching the data lifecycle before wiring.

---

## Other localStorage stores (sized for the full sweep)

For reference, the eight `-store.ts` files we'd eventually port:

```
242 lines : src/lib/auth-store.ts          (auth persistence — separate thread)
219 lines : src/lib/drafts-store.ts        ← this estimate
164 lines : src/lib/organization-store.ts  (Org + Location + Membership)
141 lines : src/lib/knowledge-store.ts     (knowledge base)
110 lines : src/lib/issues-store.ts        (weekly Issues)
 52 lines : src/lib/schedule-store.ts      (calendar / scheduling)
 49 lines : src/lib/events-store.ts        (calendar events)
 43 lines : src/lib/photo-store.ts         (photo library)
 40 lines : src/lib/feedback-store.ts      (beta feedback)
 29 lines : src/lib/meta-store.ts          (Meta OAuth connections)
```

Total: ~1,089 lines of store code to migrate.
