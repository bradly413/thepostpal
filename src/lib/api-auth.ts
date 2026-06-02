import { getSessionData } from "@/lib/auth";

export interface AuthContext {
  userId: string;
  tenantId: string;
  organizationId: string;
  role: string;
  isSuperadmin: boolean;
}

export async function requireAuthContext(): Promise<AuthContext> {
  const session = await getSessionData();
  const tenantId = session?.tenantId || session?.accountId;
  if (!session?.sub || !tenantId) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    userId: session.sub,
    tenantId,
    organizationId: tenantId,
    role: session.role,
    isSuperadmin: !!session.isSuperadmin,
  };
}

export async function requireSuperadminContext(): Promise<AuthContext> {
  const auth = await requireAuthContext();
  if (!auth.isSuperadmin) {
    throw new Error("FORBIDDEN");
  }
  return auth;
}
