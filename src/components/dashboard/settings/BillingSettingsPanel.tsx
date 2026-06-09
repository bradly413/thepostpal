"use client";

import { useState } from "react";
import { usePlan } from "@/components/dashboard/PlanProvider";
import { openBillingPortal, startCheckout, type BillingInterval } from "@/lib/billing-client";
import { isCommandPlan, planDisplayName } from "@/lib/plan-display";
import { getTierById } from "@/lib/pricing";

interface Props {
  accountEmail?: string;
}

export default function BillingSettingsPanel({ accountEmail }: Props) {
  const { plan, loading, locationCount } = usePlan();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planName = planDisplayName(plan);
  const onCommand = isCommandPlan(plan);
  const soloTier = getTierById("solo");
  const commandTier = getTierById("command");

  async function handleUpgradeToCommand() {
    setCheckoutLoading(true);
    setError(null);
    const err = await startCheckout("command", "monthly", accountEmail);
    if (err) {
      setError(err.error);
      setCheckoutLoading(false);
    }
  }

  async function handleSubscribeSolo() {
    setCheckoutLoading(true);
    setError(null);
    const err = await startCheckout("solo", interval, accountEmail);
    if (err) {
      setError(err.error);
      setCheckoutLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setError(null);
    const err = await openBillingPortal();
    if (err) {
      setError(err.error);
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="pb-panel">
        <p className="text-sm opacity-50">Loading billing…</p>
      </div>
    );
  }

  return (
    <div className="pb-panel">
      <h2 className="pb-panel-h">Billing</h2>
      <p className="text-sm opacity-65 mb-6">
        Manage your posterboy plan and Stripe subscription.
      </p>

      <div className="rounded-2xl border border-black/10 bg-white/70 p-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-1">
          Current plan
        </p>
        <p className="text-xl font-semibold">{planName}</p>
        {onCommand && locationCount > 0 ? (
          <p className="text-sm opacity-55 mt-1">
            {locationCount} active location{locationCount !== 1 ? "s" : ""}
          </p>
        ) : null}
      </div>

      {!onCommand ? (
        <div className="space-y-5 mb-6">
          <div>
            <p className="text-sm font-medium mb-2">Solo billing interval</p>
            <div className="flex gap-2">
              {(["monthly", "annual"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInterval(opt)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-semibold capitalize transition-all ${
                    interval === opt
                      ? "text-white"
                      : "border border-black/10 bg-black/[0.02] opacity-65 hover:opacity-100"
                  }`}
                  style={interval === opt ? { background: "var(--pb-press)" } : undefined}
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-xs opacity-50 mt-2">
              {interval === "annual"
                ? soloTier?.annualPriceNote ?? "$79/mo billed annually"
                : `${soloTier?.price ?? "$99"}${soloTier?.priceNote ?? "/mo"}`}
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="pb-btn-primary text-sm py-2 px-4 w-full sm:w-auto disabled:opacity-50"
              disabled={checkoutLoading}
              onClick={() => void handleUpgradeToCommand()}
            >
              {checkoutLoading ? "Redirecting…" : "Upgrade to Command"}
            </button>
            <p className="text-xs opacity-50">
              Command is {commandTier?.price ?? "$249"}
              {commandTier?.priceNote ?? "/mo base + $39/location"} — billed monthly.
            </p>
            <button
              type="button"
              className="pb-btn-secondary text-sm py-2 px-4 w-full sm:w-auto disabled:opacity-50"
              disabled={checkoutLoading}
              onClick={() => void handleSubscribeSolo()}
            >
              {checkoutLoading ? "Redirecting…" : `Subscribe to Solo (${interval})`}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm opacity-65 mb-6">
          You have full Command capabilities — multi-location rollups, approvals, and team workflows.
        </p>
      )}

      <button
        type="button"
        className="pb-btn-secondary text-sm py-2 px-4 disabled:opacity-50"
        disabled={portalLoading}
        onClick={() => void handleManageBilling()}
      >
        {portalLoading ? "Opening portal…" : "Manage billing"}
      </button>

      {error ? <p className="text-sm text-[var(--pb-press)] mt-4">{error}</p> : null}
    </div>
  );
}
