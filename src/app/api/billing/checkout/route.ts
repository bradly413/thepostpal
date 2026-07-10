import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { createCheckoutSession } from "@/lib/stripe-billing";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    try {
      if (!(await rateLimit(buildRateLimitKey("billing-checkout", request.headers, auth), 10, 60_000))) {
        return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }

    const body = await request.json();
    const tier = typeof body.tier === "string" ? body.tier : "solo";
    const billingInterval =
      body.billingInterval === "annual" ? "annual" : "monthly";

    const result = await createCheckoutSession({
      organizationId: auth.tenantId,
      customerEmail: typeof body.email === "string" ? body.email : "",
      tier,
      billingInterval,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
