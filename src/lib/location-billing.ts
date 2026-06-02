import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type DbClient = PrismaClient | Prisma.TransactionClient;

function subItemIdForAccount(accountId: string, productKey: string): string {
  return `${accountId}:${productKey}`;
}

export async function syncLocationBilling(accountId: string, client: DbClient = db) {
  const activeCount = await client.location.count({
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
