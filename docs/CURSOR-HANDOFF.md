> **Current Studio work:** this June handoff is historical. For the active
> production Studio, Library, Schedule, and Video Composer work, read
> [`CURSOR-HANDOFF-STUDIO-2026-07-24.md`](./CURSOR-HANDOFF-STUDIO-2026-07-24.md)
> first.

# Cursor handoff — Posterboy Social (2026-06-02)

Project update for picking up work in Cursor. Self-contained; read this before touching code.

## Orientation

- **Product:** Posterboy Social — AI social-content SaaS. Multi-tenant, PostgreSQL with Row-Level Security.
- **Active repo:** `~/Desktop/ventures/thepostpal/` — **this directory**. There is a STALE copy at `~/Code/thepostpal-readable-v2/`; ignore it. (Root `CLAUDE.md` still wrongly lists the stale path — do not trust it.)
- **Stack:** Next.js 16.2.6 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, Prisma + PostgreSQL (RLS).
- **Branch:** `pricing/solo-command-june-2026`.
- **Local dev:** `npm run dev` → http://127.0.0.1:8240. Demo login: `demo` / `demo123`. Local DB `posterboy_rls_dev`.
  - Prisma CLI needs the URL exported: `export $(grep -h '^DATABASE_URL=' .env.local | sed 's/"//g')`.
  - Next.js allows **one** dev server machine-wide. If `:8240` is busy, find/kill it: `lsof -nP -iTCP:8240 -sTCP:LISTEN`.

## Conventions (must follow)

- Direct commits to the branch are fine. **Do not push** unless Brad says so.
- **Never** run `git commit --amend --reset-author` (the git hint suggesting it is a trap — leave the auto-configured committer alone).
- Commit trailer required: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **No emojis in UI.**
- API pattern for tenant-scoped routes: `requireAuthContext()` → `withTenantDb(auth, tx => ...)` → `resolveAccess(userId, locationId, tx)`; return 403 on no access, 400 on missing `locationId`.
- Run `npx tsc --noEmit` and `npm run build` before considering work done.

## What just shipped (committed, NOT pushed)

- `ae8487c` — **Scheduled posts on live `/api/posts`.** Added `templateId`/`pillar` to `ScheduledPost` (migration `20260602181254_add_metadata_to_scheduled_posts`). Calendar + dispatch pages moved off localStorage onto the location-scoped API. `src/lib/scheduled-post-mappers.ts` does record↔view mapping. **Verified end-to-end** (create/update/delete round-trip persists fields; foreign location → 403; missing locationId → 400).
- `d60a375` — **Plan-aware signup + Solo social-profile limit.** Selected pricing tier flows from sign-in → signup → `ensureTenantProvisioned` (no longer hardcoded `solo`). `social-connections` route gained GET + a 402 gate via `src/lib/social-profile-limits.ts`.
- `6d58702` — **Stripe billing, code-complete.** `Subscription` persistence, subscription-metadata propagation, per-location quantity sync, billing portal. Migration `20260602190000_add_stripe_subscription_ids`. See the Stripe section below — needs env vars + a test run, not more code.
- `1d9d95e` — **Remaining dashboard surfaces wired to the RLS-backed posts API.** (Not independently verified in this handoff — worth a smoke check.)

All four commits are on `pricing/solo-command-june-2026` and **not pushed**. HEAD is green (`tsc` 0, `npm run build` 0); all 5 migrations applied to `posterboy_rls_dev`.

## Stripe billing — code-complete, needs env + testing

**Files:** `src/lib/stripe-billing.ts`, `src/lib/stripe-catalog.ts`, `src/lib/location-billing.ts`, `src/app/api/billing/checkout/route.ts`, `src/app/api/billing/portal/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `docs/stripe-billing-setup.md`; dep `stripe@^17.7.0`.

**Plan mapping:** marketing "Solo" → `PlanTier.solo`; marketing "Command" → `PlanTier.house_account`. Helpers in `src/lib/pricing.ts` (`normalizePricingTierId`, `pricingTierToOrganizationPlan`, `PricingTierId = "solo" | "command" | "brc-custom"`).

**Status (as of commit `6d58702`):** the implementation is code-complete. `stripe-billing.ts` now persists the `Subscription` row (`upsertSubscriptionRecord`), propagates `organizationId` into `subscription_data.metadata`, resolves orgs from subscription events via metadata OR a stored-`stripeCustomerId` lookup, syncs the Command per-location quantity (`syncStripeCommandLocationQuantity`), and exposes a billing portal. The webhook (`handleCheckoutSessionCompleted` + `handleSubscriptionLifecycleEvent`) and routes `POST /api/billing/checkout` and `POST /api/billing/portal` are all wired.

### Remaining before billing is live

1. **Env vars not set** — see below. All Stripe flows return "not configured"/503 until these exist. **This is the only thing blocking activation.** Prod env changes are harness-blocked, so Brad must add them in Vercel.
2. **Nothing has been run against Stripe (test or live) yet.** Code compiles/builds clean but the checkout → webhook → `Subscription` round-trip is unverified. Run the local test below once test-mode keys exist.
3. **Schema is migrated** — `Subscription` now has `stripeSubscriptionId` (@unique) + `stripeLocationItemId` (migration `20260602190000_add_stripe_subscription_ids`). No further schema work needed for billing.

(Historical note: earlier drafts of this doc flagged a missing `Subscription` write, a dead `customer.subscription.*` branch, a stubbed per-location sync, and a missing portal route. All four were resolved in `6d58702` — do not re-implement them.)

### Required env vars (see `docs/stripe-billing-setup.md`)

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SOLO_MONTHLY=price_...
STRIPE_PRICE_SOLO_ANNUAL=price_...
STRIPE_PRICE_COMMAND_BASE_MONTHLY=price_...
STRIPE_PRICE_COMMAND_LOCATION_MONTHLY=price_...
NEXT_PUBLIC_APP_URL=https://www.posterboysocial.com
```

Stripe SDK is pinned to `apiVersion: "2025-02-24.acacia"` in both `stripe-billing.ts` and the webhook — keep them in sync if bumped.

## How to verify Stripe locally

1. Add test-mode env vars to `.env.local` (test price IDs).
2. `npm run dev`, log in (`demo`/`demo123`), `POST /api/billing/checkout` with `{"tier":"solo","email":"..."}` → expect a `url`.
3. Webhook: `stripe listen --forward-to 127.0.0.1:8240/api/webhooks/stripe`, complete a test checkout, confirm `Organization.plan` flips AND a `Subscription` row is upserted with `stripeCustomerId` + `stripeSubscriptionId`.
4. Run `npx tsc --noEmit` && `npm run build`.

## Other known follow-ups (pre-existing)

- `/api/upload` writes to local disk — ephemeral on Vercel; needs S3/Cloudinary for prod.
- Existing demo sessions must re-login to get DB provisioning.
- Prod env gaps from earlier handoff: `LEONARDO_API_KEY`, Upstash aliases.
- Secondary dashboard pages (issues/reports/fb/ig/editor) still on localStorage stores.
- Reference docs: `docs/CODEX-HANDOFF.md`, `docs/MULTI_TENANT_RLS_IMPLEMENTATION.md`, `docs/stripe-billing-setup.md`.
