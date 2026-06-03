import { type AuthContext } from "@/lib/api-auth";

export function assertTenantMatch(
  auth: AuthContext,
  resourceTenantId: string | null | undefined,
  resourceLabel = "resource",
): void {
  if (auth.isSuperadmin) return;

  if (!resourceTenantId || resourceTenantId !== auth.tenantId) {
    throw new Error(`TENANT_MISMATCH:${resourceLabel}`);
  }
}

export function assertScopedIdPresent(id: string | null | undefined, field = "id"): asserts id is string {
  if (!id || !id.trim()) {
    throw new Error(`MISSING_${field.toUpperCase()}`);
  }
}
