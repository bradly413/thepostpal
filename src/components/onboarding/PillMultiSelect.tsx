"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

export interface PillOption {
  id: string;
  label: string;
  icon?: string;
}

export default function PillMultiSelect({
  options,
  selected,
  onToggle,
  leadingIcon,
}: {
  options: PillOption[];
  selected: string[];
  onToggle: (id: string) => void;
  /** A lucide icon shown at the start of every chip; swaps to a brand-red
   *  check when selected. Keeps the row anchored and avoids emojis. */
  leadingIcon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const on = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(opt.id)}
            className={`group inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-200 ${
              on
                ? "border-[#ee2532] bg-[#ee2532]/10 text-[#1c1c1e]"
                : "border-black/10 bg-white/50 text-[#76767e] hover:border-black/20 hover:text-[#1c1c1e]"
            }`}
          >
            {leadingIcon ? (
              <span
                className={`inline-flex items-center justify-center w-[15px] h-[15px] transition-colors duration-200 ${
                  on ? "text-[#ee2532]" : "text-[#b4b4bb] group-hover:text-[#76767e]"
                }`}
              >
                {on ? <Check size={15} strokeWidth={2.75} /> : leadingIcon}
              </span>
            ) : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
