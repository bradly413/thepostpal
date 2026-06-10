"use client";

import type { ChangeEvent } from "react";

// Floating-label text input (label sits in the field, floats up on focus/fill).
// Matches the onboarding's warm-light field styling.
export default function FloatingField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder=" "
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        aria-label={label}
        className="peer w-full rounded-xl border border-black/[0.1] bg-white/85 px-4 pt-6 pb-2 text-[15px] text-[#1c1c1e] transition-colors focus:border-[#ee2532]/60 focus:outline-none focus:ring-2 focus:ring-[#ee2532]/12"
      />
      <label className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-[#ee2532] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-normal peer-placeholder-shown:text-black/40 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-[#ee2532]">
        {label}
      </label>
    </div>
  );
}
