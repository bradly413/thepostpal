import { getSessionData } from "@/lib/auth";

export interface AuthContext {
  userId: string;
  organizationId: string;
}

export async function requireAuthContext(): Promise<AuthContext> {
  const session = await getSessionData();
  if (!session?.sub || !session.accountId) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    userId: session.sub,
    organizationId: session.accountId,
  };
}

