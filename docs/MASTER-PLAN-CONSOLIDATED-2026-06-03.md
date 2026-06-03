# Posterboy Social — Consolidated Master Plan

**Created:** 2026-06-03  
**Purpose:** Canonical planning artifact to merge with Claude, Gemini, Codex, and Cursor plans without losing repo truth, deployment constraints, or already-completed work.  
**Workspace note:** The operational/canonical repo path is `~/Desktop/ventures/thepostpal`. In this checkout, `~/Code/thepostpal-readable-v2` is the symlinked equivalent for the same repo family, but older docs sometimes treat it as stale. Treat path references carefully and prefer explicit absolute paths when coordinating across tools.

## 1. Executive Truth

Posterboy Social is a live AI social-content SaaS moving from a one-client foundation to a multi-tenant, multi-vertical product. The correct strategic frame on **June 3, 2026** is:

- Production is on **Postgres + Prisma + app-managed RLS**, not localStorage-only.
- Commercial pricing is **Solo** and **Command**, with `PlanTier.house_account` representing the Command tier in the database.
- The codebase is in a **multi-agent, parallel-edit** state with significant uncommitted work on top of an already-complex platform migration.
- The largest risks are no longer ideation risk. They are **state divergence**, **shared-branch collisions**, **env/config gaps**, **unfinished API migrations**, and **production verification discipline**.

This plan is designed to reconcile conflicting assistant plans by anchoring them to the current architecture and the actual blocking work.

## 2. Canonical Sources And Trust Order

When assistant plans disagree, resolve them in this order:

1. `docs/AGENT-HANDOFF-2026-06-03.md`
2. `docs/BUSINESS-PLAN-ALIGNMENT-2026-06.md`
3. `docs/PROD-ENV-CHECKLIST.md`
4. `docs/STATUS-OVERVIEW-2026-06-02.md`
5. `docs/CURSOR-HANDOFF.md`
6. `docs/CODEX-HANDOFF.md`
7. Older localStorage-era docs only as historical context

Rules:

- If a doc says the dashboard is still localStorage-backed, treat that as stale unless it is scoped to a still-unmigrated surface.
- If a plan invents a `command` Prisma enum, reject it. The database value is still `house_account`.
- If a plan assumes production is safe to mutate automatically, reject it. Production env changes and deploy-adjacent actions still require Brad.
- If a plan ignores RLS or tenant-scoped route patterns, reject it.

## 3. Product North Star

Posterboy Social is a premium B2B social-content platform for small businesses:

- **Solo**: calm, single-tenant, single-location workflow
- **Command**: multi-location, roll-up, approvals, agency/group operations
- Vertical-aware onboarding and brand generation across 12 industries
- Editorial, calm UX rather than creator-tool sprawl

The business constraint is as important as the technical one:

- Do not bloat the product into a general-purpose social suite
- Do not promise Command capabilities on Solo
- Do not ship spending automation that removes human control

## 4. Non-Negotiable Engineering Constraints

- Auth pattern for tenant routes is `requireAuthContext()` → `withTenantDb(auth, fn)` → `resolveAccess(userId, locationId, tx)`.
- RLS is the real isolation boundary. New tenant-owned data paths must respect `app.current_tenant_id`.
- `package.json` must keep `prisma generate && next build` in the build path.
- Next.js 16 rules apply. Read `node_modules/next/dist/docs/` before relying on stale conventions.
- Shared client layers should be extended, not forked:
  - `src/lib/dashboard-api.ts`
  - `src/lib/dashboard-browser-state.ts`
  - `src/components/dashboard/StateViews.tsx`
  - `src/lib/plan-features.ts`
- No direct production deploys or production env mutations without explicit approval.
- This branch is actively dirty. Avoid edits that increase merge collision risk unless the work is isolated and high leverage.

## 5. Current Architecture Snapshot

### Backend

- Next.js 16.2.6 App Router
- Prisma 6 + PostgreSQL
- App-managed RLS via `withTenantDb()`
- JWT auth in `src/lib/auth.ts` / `src/lib/api-auth.ts`
- Tenant-scoped APIs for core dashboard surfaces

### Frontend

- Dashboard is partially migrated from localStorage stores to API-backed data
- Plan-aware UI adapts between streamlined Solo and multi-location Command surfaces
- Marketing site and onboarding are heavily customized and still receiving iteration

### AI

- Anthropic for onboarding/voice/caption generation
- Gemini for images and prompt enhancement
- Leonardo integration exists but is env-blocked in production

### External integrations

- Meta organic integration exists
- Meta Ads surface is being added in parallel on `feature/meta-ads`
- Stripe billing code path exists but depends on env + live verification
- S3-backed uploads are required for durable production behavior

## 6. Current State Of Work

### Already established

- Production-grade multi-tenant data model and RLS foundation
- Plan-tier gating and adaptive dashboard behavior
- Demo login backed by real tenant provisioning
- Core API-backed surfaces for posts, photos, calendar, and related dashboard flows
- Vertical-aware onboarding and brand generation system

### In active parallel motion

- Remaining localStorage/API migration work on secondary dashboard surfaces
- Brand-engine persistence and API wire-up
- Meta Ads feature expansion
- Durable upload migration to S3 direct uploads
- Caption generation tied to tenant `brandEngine`
- Mobile and UI polish across public-facing pages

### Structural risk

- Multiple agents are editing the same branch and same repo family
- `src/components/dashboard/home/` is explicitly collision-prone and should remain isolated from unrelated work
- There is a mix of committed, uncommitted, and undocumented branch-local work

## 7. Master Workstreams

### Workstream A — Platform Integrity

Goal: keep the product technically coherent while multiple feature lanes land.

Tasks:

- Preserve and extend the RLS route pattern everywhere
- Keep Prisma schema, generated client, and migrations aligned
- Eliminate stale assumptions in docs that still imply localStorage-first architecture
- Add verification discipline to every new API surface

Exit criteria:

- All tenant routes consistently use auth + tenant DB + access checks
- Build remains green after schema or route changes
- Handoffs no longer contradict deployed architecture

### Workstream B — Dashboard API Migration Completion

Goal: finish migrating remaining dashboard surfaces off localStorage and dead stores.

Priority surfaces:

- Issues
- Organization
- Editor photo flow
- Remaining analytics/reports/dispatch polish
- Brand-related screens still relying on local shims

Required approach:

- Extend `dashboard-api.ts`
- Use `StateViews.tsx` for loading/error/empty/no-location states
- Remove dead `*-store.ts` CRUD incrementally after replacement is verified

Exit criteria:

- No user-facing dashboard CRUD depends on localStorage-only persistence
- Remaining store files are either deleted or explicitly justified

### Workstream C — Durable Production Infrastructure

Goal: eliminate the known ephemeral or env-blocked failure points before scaling beta traffic.

Tasks:

- Complete S3-backed direct upload flow
- Ensure production S3 env vars and CORS are set
- Fix durable auth env alias gaps for Upstash
- Set `NEXT_PUBLIC_APP_URL`
- Resolve Leonardo key gap if Studio HD remains a beta promise

Exit criteria:

- Uploads survive deploys
- Signups survive redeploys
- External URLs and OAuth redirects are correct in production

### Workstream D — Billing And Commercial Enforcement

Goal: make Solo/Command real in operations, not just in copy.

Tasks:

- Verify Stripe checkout → webhook → `Subscription` persistence end to end
- Confirm plan assignment and Command per-location quantity sync
- Enforce social-profile and feature gates according to plan
- Keep public pricing, signup plan normalization, and database plan mapping aligned

Exit criteria:

- Test-mode Stripe round-trip succeeds
- Solo/Command plan behavior matches the commercial promise
- No stale Good/Better/Best semantics remain in the active flow

### Workstream E — Brand Engine And AI Cohesion

Goal: make the AI layer tenant-aware instead of hardcoded or isolated.

Tasks:

- Persist and read brand book / brand engine from tenant data
- Point generation surfaces at live tenant brand context
- Standardize prompt construction around niche, tone, and contrast/voice controls
- Avoid duplicate AI entrypoints that disagree on brand truth

Exit criteria:

- AI routes read tenant-specific brand context
- Caption and content generation are no longer tied to Angie-only defaults
- Brand inputs are stored once and consumed consistently

### Workstream F — Meta Surface Expansion

Goal: extend Meta integrations without breaking plan safety or multi-tenant discipline.

Tasks:

- Keep organic and ads scopes logically separated
- Keep all ad objects defaulted to `PAUSED`
- Persist Meta connections and ad account records tenant-safely
- Add ads builder/backend flow without touching collision-heavy dashboard home files

Exit criteria:

- Ads auth is incremental
- Ad creation, insights, and account sync honor tenant and location access rules
- No route or UI path can accidentally auto-launch spending campaigns

### Workstream G — UX And Beta Readiness

Goal: remove the last obvious beta-facing inconsistencies.

Tasks:

- Mobile QA on homepage, pricing, footer, sign-in, and key dashboard screens
- Replace placeholder carousel images if still public-facing
- Ensure empty/loading/error states feel intentional across migrated pages
- Remove confusing dead-end UI paths that depend on unfinished data layers

Exit criteria:

- Small-screen regressions are closed
- Public site and onboarding no longer visibly contradict the product’s premium positioning
- Beta users can move through signup, onboarding, dashboard, and content flows without hitting obviously fake persistence

## 8. Execution Order

### Phase 0 — Stabilize Shared Truth

- Reconcile docs and branch-local reality
- Identify which uncommitted changes are authoritative versus experimental
- Confirm one canonical merge policy across agents

### Phase 1 — Finish Durability Gaps

- S3 uploads
- Upstash aliases or auth-store fallback cleanup
- `NEXT_PUBLIC_APP_URL`
- Production env checklist review

### Phase 2 — Finish Dashboard Data Migration

- Editor photo pipeline
- Issues/organization/brand surfaces
- Remove dead localStorage CRUD paths only after verification

### Phase 3 — Commercial And AI Verification

- Stripe end-to-end test
- Tenant-aware AI route alignment
- Plan gate audit across Solo vs Command

### Phase 4 — Meta Ads And Growth Surfaces

- Land Meta Ads infra and route protections
- Finalize remaining product polish that supports beta rollout

## 9. Brad-Only Or Approval-Required Dependencies

- Production Vercel env changes
- Hosted DB changes and migration application against production
- Stripe product and price configuration
- Leonardo API key provisioning
- Final production merges/deploy authorization
- GitHub auth cleanup if `gh` CLI PR creation matters operationally

No assistant plan should present these as autonomous agent actions unless explicit approval is given.

## 10. Merge Protocol For Multi-Agent Plans

Use this rubric when combining Claude, Gemini, Codex, and Cursor plans:

### Keep

- Items tied to concrete repo files, routes, env vars, migrations, or branch names
- Items that align with the trust-order docs above
- Items that preserve tenant safety, plan gating, and production caution

### Merge carefully

- UI plans that overlap the same dashboard surface
- Competing API migration proposals that touch shared client layers
- Any plan that rewrites onboarding, pricing, or auth assumptions

### Reject

- Plans that reintroduce localStorage as the long-term source of truth for core dashboard data
- Plans that invent unsupported commercial tiers or Prisma enum values
- Plans that assume production env mutation or deploy access is available to agents
- Plans that bypass RLS with direct global reads for tenant data
- Plans that touch `src/components/dashboard/home/` without a dedicated isolation lane

### Normalized output format

Every assistant plan should be rewritten into:

1. Goal
2. Files/surfaces touched
3. Dependencies
4. Risks/collision areas
5. Verification required
6. Whether Brad approval is required

If a plan cannot be normalized into that shape, it is probably too vague to execute safely.

## 11. Recommended Immediate Actions

1. Establish one shared, dated status note after reconciling the dirty branch so every agent stops planning against a different snapshot.
2. Finish the durable upload lane and production env lane before adding more UX features that depend on media.
3. Close the remaining dashboard API migration gaps so the product has one persistence model.
4. Run Stripe in test mode before treating Solo/Command as operationally complete.
5. Consolidate AI brand-context reads around tenant data before expanding more generation surfaces.
6. Keep Meta Ads isolated to new files and guarded routes until the rest of the dashboard migration settles.

## 12. Definition Of Done For Beta Readiness

Posterboy Social is beta-ready when all of the following are true:

- Core tenant data flows are API-backed and RLS-scoped
- Production env gaps are closed for auth durability, uploads, and required external services
- Solo and Command behaviors match product and billing expectations
- AI generation reads tenant brand context rather than hardcoded defaults
- Public-facing mobile regressions are closed
- Production verification scripts and smoke checks pass after deploy

Until those conditions are met, additional feature expansion should be treated as secondary.

## 13. Appendix: Known Contradictions To Resolve Explicitly

- `docs/CODEX-HANDOFF.md` still contains localStorage-first assumptions that are superseded by `docs/AGENT-HANDOFF-2026-06-03.md`.
- `docs/STATUS-OVERVIEW-2026-06-02.md` reflects a branch/deploy moment before later June 3 production claims; use it for branch context, not final truth.
- The working tree contains substantial uncommitted parallel edits on `feature/meta-ads`; plans must account for merge-collision risk before treating any current file state as settled.
- There is already an untracked `docs/MASTER-PLAN-2026-06.md`; do not assume it is authoritative until it is reviewed against this document and the dated handoffs above.
