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

## What is UNCOMMITTED and needs work — Stripe billing

Mid-flight, untested. All of it returns "not configured"/503 until env vars exist (see below).

**Files:** `src/lib/stripe-billing.ts`, `src/lib/stripe-catalog.ts`, `src/app/api/billing/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `docs/stripe-billing-setup.md`; dep `stripe@^17.7.0` (`package.json`/`package-lock.json`); pricing/marketing doc + CSS polish (`docs/POSTERBOY-MASTER-BRIEF.md`, `docs/posterboy-growth-plan.md`, `src/styles/posterboy-marketing.css`).

**Plan mapping:** marketing "Solo" → `PlanTier.solo`; marketing "Command" → `PlanTier.house_account`. Helpers in `src/lib/pricing.ts` (`normalizePricingTierId`, `pricingTierToOrganizationPlan`, `PricingTierId = "solo" | "command" | "brc-custom"`).

**What works:** `POST /api/billing/checkout` builds a Stripe Checkout session (subscription mode) when configured; webhook handles `checkout.session.completed` by reading `session.metadata.organizationId` + `pricingTier` and calling `applyStripePlanToOrganization` (updates `Organization.plan`).

### Known gaps / TODO (in priority order)

1. **Webhook never writes the `Subscription` row.** `applyStripePlanToOrganization` only updates `Organization.plan`. The `Subscription` model (`stripeCustomerId`, `status`, `@@unique([organizationId])`) is never populated → no stored customer, no idempotency, no portal. Persist customer + subscription on `checkout.session.completed`.
2. **The `customer.subscription.created/updated` branch is effectively dead.** Checkout sets metadata on the *session* but not on the subscription, so `subscription.metadata.organizationId` is empty and the branch no-ops. Fix by passing `subscription_data: { metadata: { organizationId } }` in `createCheckoutSession`, OR look the org up via stored `stripeCustomerId` (once #1 lands).
3. **Command per-location billing is a stub.** `src/lib/location-billing.ts::syncLocationBilling` only counts active locations (billable = `max(0, active - 3)`) and returns `dry`/`live-stub` — it never calls Stripe. `STRIPE_PRICE_COMMAND_LOCATION_MONTHLY` is defined but not added to checkout line items. Wire the metered/quantity sub-item when going live.
4. **No billing portal route** (manage/cancel). Add `POST /api/billing/portal` → `stripe.billingPortal.sessions.create`.
5. **Env vars not set** — see below. All Stripe flows are inert without them.

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
3. Webhook: `stripe listen --forward-to 127.0.0.1:8240/api/webhooks/stripe`, complete a test checkout, confirm `Organization.plan` flips (and, once #1 is done, a `Subscription` row appears).
4. Run `npx tsc --noEmit` && `npm run build`.

## Other known follow-ups (pre-existing)

- `/api/upload` writes to local disk — ephemeral on Vercel; needs S3/Cloudinary for prod.
- Existing demo sessions must re-login to get DB provisioning.
- Prod env gaps from earlier handoff: `LEONARDO_API_KEY`, Upstash aliases.
- Secondary dashboard pages (issues/reports/fb/ig/editor) still on localStorage stores.
- Reference docs: `docs/CODEX-HANDOFF.md`, `docs/MULTI_TENANT_RLS_IMPLEMENTATION.md`, `docs/stripe-billing-setup.md`.
