# Codex Infra Handoff — 2026-06-09

Scope for Claude / integrator:

- Sentry alert-rule status
- Stripe backend readiness review
- Neon/Vercel rotation follow-up for Brad

## Sentry

### Completed

- Confirmed the `posterboy` Sentry project is the live project tied to production issue ingest.
- Created a new production issue alert in Sentry:
  - alert id: `3558018`
  - current name in Sentry UI: `Notify Suggested Assignees`
  - scope: project `posterboy`, environment `production`
  - condition: new issue created

### Not completed

- I was **not** able to finish the second `/api/cron/*` failure alert.
- I was also **not** able to prove a live alert fire from a fresh production event inside this pass.

### Why it blocked

- The original authenticated Sentry session was in Chrome.
- While creating the first alert, the active Chrome app session changed underneath computer-use and switched to another user/browser context, so I stopped instead of continuing to click around in a live user session.
- Safari was isolated, but it did not have an authenticated Google/Sentry session, so it hit a credential prompt that I could not complete without user credentials.

### What Claude should do next

1. Re-open the authenticated Sentry browser session for org `bradly-robert-creative-llc`.
2. Keep alert `3558018` or rename it to something explicit like `posterboy-prod-new-issues`.
3. Create the second alert from `docs/SENTRY-ALERTS-RUNBOOK.md`:
   - project: `posterboy`
   - environment: `production`
   - filter: issue events where tag `route` contains `/api/cron/`
   - fallback filter if needed: tag `job` equals `cron_publish` or `cron_refresh_tokens`
4. Force a fresh production event and verify `Last Triggered` / history updates on the matching alert.

## Stripe backend review

### Signature verification

Confirmed enforced in [src/app/api/webhooks/stripe/route.ts](/Users/bradnichols/Code/thepostpal-readable-v2/src/app/api/webhooks/stripe/route.ts:12):

- missing `stripe-signature` or missing `STRIPE_WEBHOOK_SECRET` returns `400`
- `stripe.webhooks.constructEvent(...)` is used before any event handling
- invalid signatures return `400`

### Findings

#### 1. Replayed or out-of-order lifecycle events can overwrite newer subscription state

Severity: high

Relevant code:

- [src/app/api/webhooks/stripe/route.ts](/Users/bradnichols/Code/thepostpal-readable-v2/src/app/api/webhooks/stripe/route.ts:33)
- [src/lib/stripe-billing.ts](/Users/bradnichols/Code/thepostpal-readable-v2/src/lib/stripe-billing.ts:173)

Reasoning:

- The webhook route handles each Stripe event every time it is delivered.
- There is no persisted processed-event table keyed by Stripe `event.id`.
- There is no event-created timestamp guard to ignore stale retries.
- `handleSubscriptionLifecycleEvent(...)` directly reapplies org plan + subscription row state on every delivery.

Consequence:

- A delayed retry of an older `customer.subscription.updated` event can overwrite a newer cancellation or plan change.
- The current code is row-idempotent in the narrow sense that it upserts instead of inserting duplicates, but it is **not** order-safe.

#### 2. Cancellation can leave paid entitlements active

Severity: high

Relevant code:

- [src/lib/stripe-billing.ts](/Users/bradnichols/Code/thepostpal-readable-v2/src/lib/stripe-billing.ts:179)
- [src/lib/stripe-billing.ts](/Users/bradnichols/Code/thepostpal-readable-v2/src/lib/stripe-billing.ts:191)

Reasoning:

- `handleSubscriptionLifecycleEvent(...)` resolves a `plan` from current subscription item price ids.
- If that fails, it falls back to the existing stored plan.
- It then unconditionally calls `applyStripePlanToOrganization(organizationId, plan)` even when the Stripe subscription status is canceled, unpaid, or deleted.

Consequence:

- If product entitlements are gated primarily by `Organization.plan`, a canceled subscription can continue to look like `solo` or `command` instead of downgrading to a non-billing state.
- At minimum, Claude should define the intended downgrade behavior before enabling real billing.

#### 3. Webhook failure logging avoids raw request-body logging, but still logs the raw error object

Severity: low

Relevant code:

- [src/app/api/webhooks/stripe/route.ts](/Users/bradnichols/Code/thepostpal-readable-v2/src/app/api/webhooks/stripe/route.ts:47)

Reasoning:

- This route does **not** log the raw webhook body or signature, which is good.
- It does log the raw caught error object with `console.error(...)`.

Consequence:

- This is probably acceptable for beta, but if downstream Stripe/provider errors ever carry richer context than expected, logging `event.type`, `event.id`, and a sanitized message would be safer than dumping the full object.

### Migration status

The `Subscription` model is present in schema and backed by migrations:

- schema: [prisma/schema.prisma](/Users/bradnichols/Code/thepostpal-readable-v2/prisma/schema.prisma:541)
- base table: [prisma/migrations/20260520061525_location_model/migration.sql](/Users/bradnichols/Code/thepostpal-readable-v2/prisma/migrations/20260520061525_location_model/migration.sql:366)
- Stripe subscription columns/indexes: [prisma/migrations/20260602190000_add_stripe_subscription_ids/migration.sql](/Users/bradnichols/Code/thepostpal-readable-v2/prisma/migrations/20260602190000_add_stripe_subscription_ids/migration.sql:1)

I did **not** verify the live production database schema in this pass, so Claude should still treat `prisma migrate status` / `prisma migrate deploy` as a separate production-readiness check before enabling Stripe.

## Brad follow-up: Neon/Vercel rotation

Use `docs/NEON-VERCEL-INTEGRATION-RUNBOOK.md` as the operator script. The short version:

1. Neon Console -> `posterboy-prod` -> `Integrations` -> `Vercel` -> `Add`
2. Select Vercel scope `bradly413s-projects`
3. Select Vercel project `angie-social-portal`
4. Attach the Neon production branch to the Vercel production environment
5. After the integration is live, rotate:
   - Neon DB password
   - AWS IAM access key pair
6. Verify after rotation:
   - Vercel `DATABASE_URL` shows the managed/current value
   - fresh production deploy completes
   - `/api/posts`
   - `/api/calendar`
   - `/api/meta/*`
   - `/api/cron/publish`

## Recommended merge posture

- Do not ship Stripe billing live until Claude resolves the lifecycle/idempotency risks above.
- Finish Sentry alert proof from an authenticated browser session before calling monitoring complete.
