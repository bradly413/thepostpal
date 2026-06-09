"use client";

export type BillingInterval = "monthly" | "annual";
export type CheckoutTier = "solo" | "command";

export interface BillingApiError {
  error: string;
}

async function readBillingResponse(
  res: Response,
): Promise<{ url: string } | BillingApiError> {
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || data.error) {
    return { error: data.error || "Billing request failed." };
  }
  if (!data.url) {
    return { error: "No redirect URL returned." };
  }
  return { url: data.url };
}

/** Start Stripe Checkout for Solo or Command. Redirects on success. */
export async function startCheckout(
  tier: CheckoutTier,
  billingInterval: BillingInterval,
  email?: string,
): Promise<BillingApiError | null> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier, billingInterval, email }),
  });
  const result = await readBillingResponse(res);
  if ("error" in result) return result;
  window.location.href = result.url;
  return null;
}

/** Open Stripe Customer Portal. Redirects on success. */
export async function openBillingPortal(): Promise<BillingApiError | null> {
  const res = await fetch("/api/billing/portal", {
    method: "POST",
    credentials: "same-origin",
  });
  const result = await readBillingResponse(res);
  if ("error" in result) return result;
  window.location.href = result.url;
  return null;
}
