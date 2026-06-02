import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { createBillingPortalSession } from "@/lib/stripe-billing";

export async function POST() {
  try {
    const auth = await requireAuthContext();
    const result = await createBillingPortalSession(auth.tenantId);

    if ("error" in result) {
      const status = result.error.includes("not configured") ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ url: result.url });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
