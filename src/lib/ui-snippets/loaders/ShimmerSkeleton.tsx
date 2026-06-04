"use client";

// Shimmer loading skeleton. Original, license-safe.
// Usage: <ShimmerSkeleton className="h-4 w-40 rounded" />
export default function ShimmerSkeleton({ className = "h-4 w-full rounded" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-black/[0.06] ${className}`}>
      <div className="pb-skel-shine pointer-events-none absolute inset-0" />
      <style>{`
        .pb-skel-shine { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent); transform: translateX(-100%); animation: pb-skel 1.5s infinite; }
        @keyframes pb-skel { to { transform: translateX(100%); } }
        @media (prefers-reduced-motion: reduce) { .pb-skel-shine { animation: none; } }
      `}</style>
    </div>
  );
}
