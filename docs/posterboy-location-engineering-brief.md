# posterboy — Location Model & Corporate Approval Workflow
**Engineering Brief**
v1.0 · May 17, 2026 · Author: Brad Nichols (drafted with Claude)
Source-of-truth ref: Posterboy Master Brief v1.1, sections 1, 3, 4, 7

---

## 0. Why this exists

The Master Brief commits posterboy to the **Multi-Location** revenue tier ($499/mo base + $49/location/mo). That tier is non-functional without two new platform primitives:

1. A **Location** entity — a self-contained social presence (its own connected accounts, brand kit, content calendar, photo library, analytics) that lives under an Account.
2. A **corporate approval workflow** — content drafted at the location level must be approvable at the account level before publishing to that location's connected social accounts.

Half of the brief's target audience (hospitality groups, bank branch networks, franchise operators, multi-office service businesses) literally cannot buy posterboy without these. This work is **launch-blocking**, not fast-follow.

This brief is the implementation contract. Codex/Cowork can build from it directly.

---

## 1. Glossary

| Term | Meaning |
|---|---|
| **Account** | The billing parent. One Stripe customer. Owns Users and Locations. |
| **Location** | A self-contained social presence. Has its own connected socials, brand kit, scheduled posts, photo library, calendar, analytics. |
| **User** | A human login. Belongs to one Account. Has access to one, several, or all Locations within that Account via memberships. |
| **LocationMembership** | The join between User and Location, scoped by role. |
| **Default Location** | The auto-created Location every existing Account gets during migration. Single-location buyers never see Location UI. |
| **Approval Rule** | A per-location configuration that says "posts to this location require approval from these reviewers before publishing." |
| **Post Approval** | The state record of a specific post moving through the approval workflow. |

---

## 2. Data model

### 2.1 New models

```prisma
model Location {
  id                String   @id @default(cuid())
  accountId         String
  account           Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  name              String
  slug              String                                 // url-safe, unique within account
  status            LocationStatus @default(ACTIVE)

  // Branding (denormalized for speed; can move to a relation later)
  brandPrimaryColor String?
  brandAccentColor  String?
  brandFontStack    String?
  brandVoiceJson    Json?                                  // structured voice training data

  // Address / business context (used for AI prompts, local content)
  city              String?
  state             String?
  country           String?
  timeZone          String   @default("America/Chicago")

  // Relations
  memberships       LocationMembership[]
  socialConnections SocialConnection[]
  scheduledPosts    ScheduledPost[]
  photoAssets       PhotoAsset[]
  calendarEvents    CalendarEvent[]
  templates         Template[]                              // optional per-location overrides
  approvalRule      ApprovalRule?
  postApprovals     PostApproval[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  archivedAt        DateTime?

  @@unique([accountId, slug])
  @@index([accountId, status])
}

enum LocationStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}

model LocationMembership {
  id          String   @id @default(cuid())
  locationId  String
  userId      String
  location    Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        LocationRole

  createdAt   DateTime @default(now())
  @@unique([locationId, userId])
  @@index([userId])
}

enum LocationRole {
  LOCATION_ADMIN      // can edit settings, post, invite location members, approve
  LOCATION_EDITOR     // can draft and schedule, submit for approval, cannot approve
  LOCATION_VIEWER     // read-only
}

model ApprovalRule {
  id                 String   @id @default(cuid())
  locationId         String   @unique
  location           Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  requiresApproval   Boolean  @default(false)
  reviewerUserIds    String[]                              // any user in this list can approve
  minApprovers       Int      @default(1)
  autoApproveAfterMs Int?                                  // optional: auto-approve if not reviewed in N ms
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model PostApproval {
  id               String       @id @default(cuid())
  scheduledPostId  String       @unique
  scheduledPost    ScheduledPost @relation(fields: [scheduledPostId], references: [id], onDelete: Cascade)
  locationId       String
  location         Location     @relation(fields: [locationId], references: [id])

  status           ApprovalStatus @default(PENDING_REVIEW)
  submittedByUserId String
  reviewedByUserId String?
  reviewedAt       DateTime?
  reviewerNotes    String?

  history          ApprovalEvent[]

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([locationId, status])
}

enum ApprovalStatus {
  PENDING_REVIEW
  APPROVED
  CHANGES_REQUESTED
  REJECTED
}

model ApprovalEvent {
  id              String        @id @default(cuid())
  postApprovalId  String
  postApproval    PostApproval  @relation(fields: [postApprovalId], references: [id], onDelete: Cascade)
  actorUserId     String
  action          ApprovalAction
  notes           String?
  createdAt       DateTime      @default(now())
}

enum ApprovalAction {
  SUBMITTED
  APPROVED
  CHANGES_REQUESTED
  REJECTED
  RESUBMITTED
  AUTO_APPROVED
}
```

### 2.2 Modified models

All resources currently scoped to **Account** that should move to **Location**:

| Model | Change |
|---|---|
| `SocialConnection` | Add `locationId` FK (required). Drop `accountId` only after migration verified. |
| `ScheduledPost` | Add `locationId` FK (required). Posts target a location's connected socials. |
| `PhotoAsset` | Add `locationId` FK (required). |
| `CalendarEvent` | Add `locationId` FK (required). |
| `KnowledgeBaseEntry` | Add `locationId` FK (required). |
| `Template` | Keep `accountId` (account-level templates). Add optional `locationId` for location-overrides. |

`User` and `AccountMembership` stay account-scoped — users are humans who belong to an account, location access is via `LocationMembership`.

### 2.3 Migration plan

**Phase 1 — Schema additive (zero downtime):**
1. Apply new models above
2. Add nullable `locationId` columns to all affected existing tables

**Phase 2 — Backfill (one-time script):**
1. For every Account: create a `Location` with `name = "Default"`, `slug = "default"`
2. For every Account: create a `LocationMembership` for every existing AccountMembership user, role inherited (account_admin → LOCATION_ADMIN, etc.)
3. For every existing SocialConnection/ScheduledPost/PhotoAsset/CalendarEvent/KnowledgeBaseEntry: set `locationId = <account's default location id>`

**Phase 3 — Make locationId NOT NULL:**
1. Verify backfill: assert zero NULL locationId rows across all affected tables
2. Apply NOT NULL constraints

**Phase 4 — UI gating:**
1. Existing single-location accounts: Location UI hidden (or shown as breadcrumb-only)
2. Multi-Location tier subscribers: Location switcher visible in app shell

**Rollback:** Phase 1 is fully reversible (drop new tables, drop new nullable columns). Phase 3 is the point of no return — gate behind a feature flag in production.

---

## 3. Approval workflow state machine

```
        ┌───────────┐
        │   DRAFT   │  ← user creates post, edits freely
        └─────┬─────┘
              │ user clicks "Schedule" or "Submit for approval"
              ▼
   ┌──────────────────────┐
   │ Approval required?   │
   └───┬──────────────────┘
       │
   ┌───┴────┐
   │   No   │ ──────────────────┐
   │ (rule  │                   ▼
   │ off)   │            ┌────────────┐
   └────────┘            │ SCHEDULED  │ → publishes at scheduled time
                         └────────────┘
       │
   ┌───┴────┐
   │  Yes   │
   └───┬────┘
       ▼
┌──────────────────┐
│ PENDING_REVIEW   │  ← reviewers get notified
└──────┬───────────┘
       │
   ┌───┴──────────────────────────────────┐
   ▼                  ▼                   ▼
APPROVED      CHANGES_REQUESTED         REJECTED
   │                  │                   │
   ▼                  │                   │
SCHEDULED       (back to DRAFT)         (terminal,
                  with notes              archived)
                  visible)
```

**Rules:**
- Only users in `ApprovalRule.reviewerUserIds` can transition `PENDING_REVIEW → APPROVED|CHANGES_REQUESTED|REJECTED`.
- Submitter can withdraw a `PENDING_REVIEW` post back to `DRAFT` (cancellation).
- `minApprovers > 1` requires N independent approvers before moving to `APPROVED`. Track each approval as an `ApprovalEvent`.
- `autoApproveAfterMs` is optional — if set and no reviewer acts within the window, the post auto-approves and an `AUTO_APPROVED` `ApprovalEvent` is logged. Default: not set (manual only).
- A post in `APPROVED` state cannot be edited; if a submitter wants to change it, they clone it as a new draft.

---

## 4. API surface

### 4.1 New endpoints

```
GET    /api/locations                        List locations for current account
POST   /api/locations                        Create a location
GET    /api/locations/:id                    Get one
PUT    /api/locations/:id                    Update name, brand kit, etc.
DELETE /api/locations/:id                    Archive (soft delete)

GET    /api/locations/:id/members            List members
POST   /api/locations/:id/members            Add user to location with role
DELETE /api/locations/:id/members/:userId    Remove user from location

GET    /api/locations/:id/approval-rule      Get approval rule
PUT    /api/locations/:id/approval-rule      Set/update approval rule

GET    /api/locations/:id/pending-approvals  List posts pending review for this location
POST   /api/posts/:id/submit-for-approval    Move DRAFT → PENDING_REVIEW
POST   /api/posts/:id/approve                Reviewer action: approve
POST   /api/posts/:id/request-changes        Reviewer action: changes requested
POST   /api/posts/:id/reject                 Reviewer action: reject
POST   /api/posts/:id/withdraw               Submitter cancels review

GET    /api/account/locations-roll-up        Cross-location dashboard (Multi-Location tier only)
```

### 4.2 Modified endpoints

All endpoints currently scoped to "account context" now require an explicit `locationId` (header, query param, or path segment depending on REST convention).

| Endpoint | Change |
|---|---|
| `POST /api/posts` | Require `locationId` in body |
| `GET /api/posts` | Filter by `locationId` (or `?location=all` for cross-location, gated by role) |
| `POST /api/social-connections` | Require `locationId` |
| `GET /api/photos` | Filter by `locationId` |
| `GET /api/calendar` | Filter by `locationId` |
| All Meta OAuth callbacks | Persist tokens against `locationId`, not `accountId` |

### 4.3 Authorization checks (middleware)

Every authenticated request now resolves the user's effective access to a target `locationId`:

```
resolveAccess(userId, locationId) → {
  hasAccess: boolean,
  role: LocationRole | null,
  canApprove: boolean
}
```

`canApprove` is computed from the location's `ApprovalRule.reviewerUserIds` plus the user's role.

---

## 5. Billing integration

### 5.1 Stripe configuration

Multi-Location tier uses **two Stripe Prices** on one subscription:
- `price_multilocation_base` — $499/mo flat (or $415/mo annual)
- `price_multilocation_location` — $49/mo per quantity (or $39/mo annual)

The subscription line items are:
- 1 × base
- N × location, where N = `count(locations where status = ACTIVE) - 3` (first 3 are included)

### 5.2 Sync logic

When a location is created or archived, fire a webhook handler that recomputes the location count and calls Stripe to update the subscription's metered line item quantity:

```ts
async function syncLocationBilling(accountId: string) {
  const activeCount = await db.location.count({
    where: { accountId, status: 'ACTIVE' }
  });
  const billableCount = Math.max(0, activeCount - 3);
  await stripe.subscriptionItems.update(
    subItemIdForAccount(accountId, 'multilocation_location'),
    { quantity: billableCount, proration_behavior: 'create_prorations' }
  );
}
```

### 5.3 Tier gating

| Tier | Max locations | Approval workflow |
|---|---|---|
| Good / Better / Best (self-serve) | 1 | Not available |
| Team 5 / 10 / 25 | 1 | Not available |
| Multi-Location | Unlimited (metered) | Available, default off |

Attempting to create a 2nd location on a single-location tier returns `402 Payment Required` with an upgrade CTA.

---

## 6. UI implications

### 6.1 App shell changes

- **Location switcher** in the top-left of the app shell (only renders for Multi-Location accounts). Dropdown lists all locations the current user has access to, plus an "All locations" view if user is account-level admin.
- **Persisted context** — selected location persists in URL (`/l/<slug>/dashboard`) and is restored on next session.
- Single-location accounts: switcher is hidden; URL prefix is implicit.

### 6.2 New screens

| Screen | For | Notes |
|---|---|---|
| **Location settings** | Location admins | Name, branding, timezone, social connections, approval rule |
| **Approval queue** | Reviewers | List of `PENDING_REVIEW` posts, sortable by submitted-at, with inline approve/changes/reject |
| **Account-level locations index** | Account owners | Cards for each location: name, last activity, pending approvals count, "Switch to" CTA |
| **Cross-location calendar** | Account owners | Calendar with color-coded posts by location |
| **Roll-up reporting** | Account owners | Aggregate metrics across all locations |

### 6.3 Existing screens

The composer gains a "Submit for approval" button when the active location's `ApprovalRule.requiresApproval = true`. Submitter sees the post move to PENDING_REVIEW state with a visible status badge. Reviewers see PENDING_REVIEW posts in their queue.

---

## 7. Notifications

| Event | Recipients | Channel |
|---|---|---|
| Post submitted for approval | All reviewers for that location | Email + in-app |
| Post approved | Submitter | In-app |
| Changes requested | Submitter | Email + in-app (notes included) |
| Post rejected | Submitter | Email + in-app |
| Auto-approve fired | Reviewers + submitter | Email |

Notification preferences are per-user; defaults above.

---

## 8. Telemetry

Track for product and billing:
- `location.created` (accountId, locationId, source)
- `location.archived`
- `approval.submitted` (locationId, postId, reviewersNotified)
- `approval.approved` (locationId, postId, reviewerId, latencyMs)
- `approval.changes_requested`
- `approval.rejected`
- `approval.auto_approved`
- `billing.location_count_synced` (accountId, oldQty, newQty)

---

## 9. Out of scope for v1

Explicitly NOT building in this slice (parking for v2):
- Multi-reviewer parallel approval flows beyond `minApprovers` count (think: legal review AND compliance review on the same post)
- Approval templates / required fields (e.g. "this location requires a disclaimer in every post")
- Cross-location post cloning ("approve once, publish to 13 locations") — see section 10
- Per-location AI brand voice training (account-level voice with location overrides is enough for v1)
- White-label / custom domain per location (Multi-Location tier ships with custom branding; not custom domain)
- Granular RBAC beyond the three roles defined

---

## 10. Roadmap markers (v2 candidates)

**Cross-location publishing.** Compose once, fan out to N locations. Requires per-location preview, per-location approval, per-location scheduling. High customer value for restaurant groups with rotating menus. Plan for v2 but design the v1 schema to accommodate (`PostApproval` already has `locationId`, so a `Post` could have many `PostApprovals` later).

**Brand kit inheritance.** Account-level brand kit → Location-level override → Post-level override. v1 just has Location-level. v2 introduces inheritance with override badges.

**Approval analytics.** Reviewer latency, approval rates, top reasons for changes_requested. v2 dashboard.

---

## 11. Acceptance criteria

This work is "done" when:

- [ ] All five new models + enums migrated to production
- [ ] All five existing models carry `locationId` NOT NULL
- [ ] Backfill script executed; zero NULL `locationId` rows in production
- [ ] Every existing single-location account has a Default Location and equivalent memberships
- [ ] Approval state machine implemented; all four transitions tested
- [ ] Stripe Multi-Location product + prices configured; subscription sync working
- [ ] Location switcher in app shell (gated by Multi-Location tier)
- [ ] Approval queue screen functional
- [ ] Account owner can create a 2nd location and Stripe quantity updates within 30 seconds
- [ ] Single-location users see no UI changes
- [ ] Notifications fire on all four reviewer transitions

---

## 12. Open questions for Brad

1. **Default approval rule for new Multi-Location accounts:** off (opt-in) or on (opt-out)? Recommend **off** — let the customer turn it on once their workflow is clear.
2. **Can a location be moved between accounts?** v1: no. v2 maybe (M&A use case).
3. **Reviewer role hierarchy:** does an Account-level admin always have approval rights on every location, or only via explicit `LocationMembership`? Recommend **explicit only** — clean boundaries, no surprise approvals.
4. **Annual billing discount on per-location:** $49/mo → $39/mo annual (20% off). Mirrors self-serve annual logic. Confirm.

---

*End of brief. Codex/Cowork: build from Section 2 down. Open questions block billing finalization, not core build.*
