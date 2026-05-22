import { db } from "@/lib/db";

function subItemIdForAccount(accountId: string, productKey: string): string {
  return `${accountId}:${productKey}`;
}

export async function syncLocationBilling(accountId: string) {
  const activeCount = await db.location.count({
    where: { organizationId: accountId, status: "ACTIVE" },
  });
  const billableCount = Math.max(0, activeCount - 3);

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      mode: "dry",
      accountId,
      activeCount,
      billableCount,
      subItemId: subItemIdForAccount(accountId, "multilocation_location"),
    };
  }

  // Intentional stub until live Stripe wiring is enabled for this repo.
  return {
    mode: "live-stub",
    accountId,
    activeCount,
    billableCount,
    subItemId: subItemIdForAccount(accountId, "multilocation_location"),
    prorationBehavior: "create_prorations",
  };
}

