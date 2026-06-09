"use client";

import { useState } from "react";
import { startCheckout } from "@/lib/billing-client";

interface Props {
  className?: string;
  label?: string;
  variant?: "primary" | "link";
}

export default function UpgradeToCommandButton({
  className,
  label = "Upgrade to Command",
  variant = "primary",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const err = await startCheckout("command", "monthly");
    if (err) {
      setError(err.error);
      setLoading(false);
    }
  }

  const btnClass =
    variant === "link"
      ? `underline font-semibold text-[var(--pb-press)] hover:opacity-80 disabled:opacity-50 ${className ?? ""}`
      : `pb-btn-primary text-sm py-2 px-4 disabled:opacity-50 ${className ?? ""}`;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className={btnClass}
        disabled={loading}
        onClick={() => void handleClick()}
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error ? <span className="text-xs text-[var(--pb-press)]">{error}</span> : null}
    </span>
  );
}
