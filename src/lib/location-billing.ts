import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { isStripeConfigured, syncStripeCommandLocationQuantity } from "@/lib/stripe-billing";

type DbClient = PrismaClient | Prisma.TransactionClient;

function subItemIdForAccount(accountId: string, productKey: string): string {
  return `${accountId}:${productKey}`;
}

export async function syncLocationBilling(accountId: string, client: DbClient = db) {
  const activeCount = await client.location.count({
    where: { organizationId: accountId, status: "ACTIVE" },
  });
  const billableCount = Math.max(0, activeCount - 3);

  const organization = await client.organization.findFirst({
    where: { id: accountId },
    select: { plan: true },
  });

  if (!isStripeConfigured()) {
    return {
      mode: "dry" as const,
      accountId,
      activeCount,
      billableCount,
      subItemId: subItemIdForAccount(accountId, "multilocation_location"),
    };
  }

  if (organization?.plan !== "house_account") {
    return {
      mode: "not-command" as const,
      accountId,
      activeCount,
      billableCount,
    };
  }

  const stripeSync = await syncStripeCommandLocationQuantity(
    accountId,
    billableCount,
  );

  if (!stripeSync.synced) {
    return {
      mode: "no-stripe-sub" as const,
      accountId,
      activeCount,
      billableCount,
      subItemId: subItemIdForAccount(accountId, "multilocation_location"),
    };
  }

  return {
    mode: "synced" as const,
    accountId,
    activeCount,
    billableCount,
    subItemId: stripeSync.stripeLocationItemId ?? subItemIdForAccount(accountId, "multilocation_location"),
    prorationBehavior: "create_prorations",
  };
}
