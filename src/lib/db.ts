import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __posterboyPrisma: PrismaClient | undefined;
}

export const db =
  global.__posterboyPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__posterboyPrisma = db;
}

export type TenantDbClient = Prisma.TransactionClient;

export interface TenantDbContext {
  tenantId: string;
  userId: string;
  isSuperadmin?: boolean;
}

export async function withTenantDb<T>(
  context: TenantDbContext,
  run: (tx: TenantDbClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT
        set_config('app.current_tenant_id', ${context.tenantId}, true),
        set_config('app.current_user_id', ${context.userId}, true),
        set_config('app.current_is_superadmin', ${context.isSuperadmin ? "true" : "false"}, true)
    `;

    return run(tx);
  });
}
