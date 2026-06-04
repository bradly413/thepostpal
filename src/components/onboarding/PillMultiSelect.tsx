"use client";

export interface PillOption {
  id: string;
  label: string;
  icon?: string;
}

export default function PillMultiSelect({
  options,
  selected,
  onToggle,
  showIcons = false,
}: {
  options: PillOption[];
  selected: string[];
  onToggle: (id: string) => void;
  showIcons?: boolean;
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
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-200 ${
              on
                ? "border-[#ee2532] bg-[#ee2532]/10 text-[#1c1c1e]"
                : "border-black/10 bg-white/50 text-[#76767e] hover:border-black/20 hover:text-[#1c1c1e]"
            }`}
          >
            {showIcons && opt.icon ? <span className="text-base">{opt.icon}</span> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
