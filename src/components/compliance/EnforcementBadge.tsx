import type { EnforcementLevel } from "@/lib/compliance/client-types";

const STYLES: Record<EnforcementLevel, { label: string; className: string }> = {
  block: {
    label: "Block",
    className: "bg-[rgba(238,37,50,0.12)] text-[#c41e2a] border-[rgba(238,37,50,0.35)]",
  },
  warn: {
    label: "Warn",
    className: "bg-[rgba(200,140,40,0.12)] text-[#9a6b12] border-[rgba(200,140,40,0.35)]",
  },
  suggest: {
    label: "Suggest",
    className: "bg-black/[0.04] text-black/55 border-black/10",
  },
};

export default function EnforcementBadge({ level }: { level: EnforcementLevel }) {
  const s = STYLES[level];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.className}`}
    >
      {s.label}
    </span>
  );
}
