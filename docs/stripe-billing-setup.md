# Stripe billing — Solo & Command (June 2026)

Commercial tiers map to Prisma `Organization.plan`:

| Marketing tier | Prisma `PlanTier` | Stripe env keys |
|----------------|-------------------|-----------------|
| Solo ($99/mo, $79 annual) | `solo` | `STRIPE_PRICE_SOLO_MONTHLY`, `STRIPE_PRICE_SOLO_ANNUAL` |
| Command ($249 base + $39/location) | `house_account` | `STRIPE_PRICE_COMMAND_BASE_MONTHLY`, `STRIPE_PRICE_COMMAND_LOCATION_MONTHLY` |

## Required env vars

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SOLO_MONTHLY=price_...
STRIPE_PRICE_SOLO_ANNUAL=price_...
STRIPE_PRICE_COMMAND_BASE_MONTHLY=price_...
STRIPE_PRICE_COMMAND_LOCATION_MONTHLY=price_...
NEXT_PUBLIC_APP_URL=https://www.posterboysocial.com
```

Stripe SDK `apiVersion` is pinned in `src/lib/stripe-billing.ts` (`STRIPE_API_VERSION`) — keep webhook and checkout in sync if bumped.

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/billing/checkout` | Authenticated Checkout (`tier`, optional `billingInterval`, `email`) |
| `POST /api/billing/portal` | Stripe Customer Portal (manage/cancel) |
| `POST /api/webhooks/stripe` | Persists `Subscription` + updates `Organization.plan` |

## Persistence

On `checkout.session.completed` and subscription lifecycle events:

- `Organization.plan` updated via `pricingTierToOrganizationPlan()`
- `Subscription` upserted with `stripeCustomerId`, `stripeSubscriptionId`, `status`, `stripeLocationItemId` (Command location add-on)

Checkout passes `subscription_data.metadata.organizationId` so `customer.subscription.*` webhooks resolve the tenant.

Command checkout includes the location price line item when `billableCount > 0` (`max(0, activeLocations - 3)`). Adding/archiving locations calls `syncLocationBilling()` → `syncStripeCommandLocationQuantity()`.

## Local verification

1. Add test-mode env vars to `.env.local`.
2. `npm run dev`, log in (`demo` / `demo123`).
3. `POST /api/billing/checkout` with `{"tier":"solo","email":"you@example.com"}` → `{ "url": "..." }`.
4. `stripe listen --forward-to 127.0.0.1:8240/api/webhooks/stripe`, complete checkout → confirm `Subscription` row + `Organization.plan`.
5. `POST /api/billing/portal` → portal URL when `stripeCustomerId` exists.
6. `npx tsc --noEmit && npm run build`.
