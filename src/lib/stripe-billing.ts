import "server-only";

import type { PlanTier } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import {
  normalizeCheckoutTier,
  stripePriceIdForTier,
  planTierFromStripePriceId,
  getStripePriceCatalog,
  commandLocationPriceId,
} from "@/lib/stripe-catalog";
import { pricingTierToOrganizationPlan, normalizePricingTierId } from "@/lib/pricing";

export const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function getStripeClient(): Promise<Stripe> {
  const StripeSdk = (await import("stripe")).default;
  return new StripeSdk(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: STRIPE_API_VERSION,
  });
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:8240";
}

export async function countBillableCommandLocations(
  organizationId: string,
): Promise<{ activeCount: number; billableCount: number }> {
  const activeCount = await db.location.count({
    where: { organizationId, status: "ACTIVE" },
  });
  return {
    activeCount,
    billableCount: Math.max(0, activeCount - 3),
  };
}

export async function applyStripePlanToOrganization(
  organizationId: string,
  plan: PlanTier,
): Promise<void> {
  await db.organization.update({
    where: { id: organizationId },
    data: { plan },
  });
}

export async function upsertSubscriptionRecord(input: {
  organizationId: string;
  plan: PlanTier;
  status: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeLocationItemId?: string | null;
}): Promise<void> {
  await db.subscription.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      plan: input.plan,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      stripeLocationItemId: input.stripeLocationItemId ?? null,
    },
    update: {
      plan: input.plan,
      status: input.status,
      ...(input.stripeCustomerId !== undefined
        ? { stripeCustomerId: input.stripeCustomerId }
        : {}),
      ...(input.stripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: input.stripeSubscriptionId }
        : {}),
      ...(input.stripeLocationItemId !== undefined
        ? { stripeLocationItemId: input.stripeLocationItemId }
        : {}),
    },
  });
}

export async function resolveOrganizationIdFromSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  if (subscription.metadata?.organizationId) {
    return subscription.metadata.organizationId;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;

  const row = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { organizationId: true },
  });

  return row?.organizationId ?? null;
}

export async function resolvePlanFromStripeSubscription(
  priceIds: string[],
): Promise<PlanTier | null> {
  for (const priceId of priceIds) {
    const plan = planTierFromStripePriceId(priceId);
    if (plan) return plan;
  }
  return null;
}

function locationItemIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  const locationPriceId = commandLocationPriceId();
  if (!locationPriceId) return null;
  const item = subscription.items.data.find(
    (entry) => entry.price.id === locationPriceId,
  );
  return item?.id ?? null;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const organizationId = session.metadata?.organizationId;
  const pricingTier = normalizePricingTierId(session.metadata?.pricingTier);
  if (!organizationId || !pricingTier) return;

  const plan = pricingTierToOrganizationPlan(pricingTier);
  if (!plan) return;

  const stripe = await getStripeClient();

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  let status = "active";
  let stripeLocationItemId: string | null = null;

  if (stripeSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    status = subscription.status;
    stripeLocationItemId = locationItemIdFromSubscription(subscription);
  }

  await applyStripePlanToOrganization(organizationId, plan);
  await upsertSubscriptionRecord({
    organizationId,
    plan,
    status,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeLocationItemId,
  });
}

export async function handleSubscriptionLifecycleEvent(
  subscription: Stripe.Subscription,
): Promise<void> {
  const organizationId = await resolveOrganizationIdFromSubscription(subscription);
  if (!organizationId) return;

  const priceIds = subscription.items.data.map((item) => item.price.id);
  const plan =
    (await resolvePlanFromStripeSubscription(priceIds)) ??
    (
      await db.subscription.findUnique({
        where: { organizationId },
        select: { plan: true },
      })
    )?.plan;

  if (!plan) return;

  await applyStripePlanToOrganization(organizationId, plan);
  await upsertSubscriptionRecord({
    organizationId,
    plan,
    status: subscription.status,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
    stripeLocationItemId: locationItemIdFromSubscription(subscription),
  });
}

export async function createCheckoutSession(input: {
  organizationId: string;
  customerEmail: string;
  tier: string;
  billingInterval?: "monthly" | "annual";
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured for this environment." };
  }

  const tier = normalizeCheckoutTier(input.tier);
  if (!tier || tier === "brc-custom") {
    return { error: "Unsupported plan for self-serve checkout." };
  }

  const basePriceId = stripePriceIdForTier(tier, input.billingInterval ?? "monthly");
  if (!basePriceId) {
    return { error: "Missing Stripe price ID for this plan." };
  }

  const stripe = await getStripeClient();
  const existing = await db.subscription.findUnique({
    where: { organizationId: input.organizationId },
    select: { stripeCustomerId: true },
  });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: basePriceId, quantity: 1 },
  ];

  if (tier === "command") {
    const locationPriceId = commandLocationPriceId();
    const { billableCount } = await countBillableCommandLocations(input.organizationId);
    if (locationPriceId && billableCount > 0) {
      lineItems.push({ price: locationPriceId, quantity: billableCount });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(existing?.stripeCustomerId
      ? { customer: existing.stripeCustomerId }
      : { customer_email: input.customerEmail || undefined }),
    line_items: lineItems,
    success_url: `${appBaseUrl()}/dashboard?checkout=success`,
    cancel_url: `${appBaseUrl()}/pricing?checkout=cancelled`,
    metadata: {
      organizationId: input.organizationId,
      pricingTier: tier,
    },
    subscription_data: {
      metadata: {
        organizationId: input.organizationId,
        pricingTier: tier,
      },
    },
  });

  if (!session.url) {
    return { error: "Stripe did not return a checkout URL." };
  }

  return { url: session.url };
}

export async function createBillingPortalSession(
  organizationId: string,
): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured for this environment." };
  }

  const row = await db.subscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });

  if (!row?.stripeCustomerId) {
    return { error: "No Stripe customer on file for this workspace." };
  }

  const stripe = await getStripeClient();
  const portal = await stripe.billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${appBaseUrl()}/dashboard/settings`,
  });

  if (!portal.url) {
    return { error: "Stripe did not return a portal URL." };
  }

  return { url: portal.url };
}

export async function syncStripeCommandLocationQuantity(
  organizationId: string,
  billableCount: number,
): Promise<{ synced: boolean; stripeLocationItemId?: string | null }> {
  const locationPriceId = commandLocationPriceId();
  if (!locationPriceId) {
    return { synced: false };
  }

  const sub = await db.subscription.findUnique({
    where: { organizationId },
    select: { stripeSubscriptionId: true, stripeLocationItemId: true },
  });

  if (!sub?.stripeSubscriptionId) {
    return { synced: false };
  }

  const stripe = await getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
  const existingItem =
    subscription.items.data.find((item) => item.price.id === locationPriceId) ??
    (sub.stripeLocationItemId
      ? subscription.items.data.find((item) => item.id === sub.stripeLocationItemId)
      : undefined);

  if (billableCount <= 0) {
    if (existingItem) {
      await stripe.subscriptionItems.del(existingItem.id, {
        proration_behavior: "create_prorations",
      });
    }
    await db.subscription.update({
      where: { organizationId },
      data: { stripeLocationItemId: null },
    });
    return { synced: true, stripeLocationItemId: null };
  }

  if (existingItem) {
    const updated = await stripe.subscriptionItems.update(existingItem.id, {
      quantity: billableCount,
      proration_behavior: "create_prorations",
    });
    await db.subscription.update({
      where: { organizationId },
      data: { stripeLocationItemId: updated.id },
    });
    return { synced: true, stripeLocationItemId: updated.id };
  }

  const created = await stripe.subscriptionItems.create({
    subscription: sub.stripeSubscriptionId,
    price: locationPriceId,
    quantity: billableCount,
    proration_behavior: "create_prorations",
  });

  await db.subscription.update({
    where: { organizationId },
    data: { stripeLocationItemId: created.id },
  });

  return { synced: true, stripeLocationItemId: created.id };
}
