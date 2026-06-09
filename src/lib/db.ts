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

/**
 * Signup/login provisioning — sets tenant GUC so RLS allows org/user/location inserts.
 */
export async function withProvisioningDb<T>(
  context: { tenantId: string; userId: string },
  run: (tx: TenantDbClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT
        set_config('app.current_tenant_id', ${context.tenantId}, true),
        set_config('app.current_user_id', ${context.userId}, true),
        set_config('app.current_is_superadmin', 'false', true)
    `;

    return run(tx);
  });
}

/** Cross-tenant jobs (Vercel Cron) — RLS bypass via superadmin GUC. */
export async function withCronDb<T>(run: (tx: TenantDbClient) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT
        set_config('app.current_tenant_id', '', true),
        set_config('app.current_user_id', 'system-cron', true),
        set_config('app.current_is_superadmin', 'true', true)
    `;

    return run(tx);
  });
}
