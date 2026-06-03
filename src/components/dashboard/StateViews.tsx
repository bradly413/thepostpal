"use client";

import type { ReactNode } from "react";

// Shared, calm state views for the dashboard. Neutral-chic / luxury editorial:
// warm cream surfaces, soft ink, gold accent (#D4A853), no emojis, no spinners.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/[0.05] ${className}`} />;
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-black/[0.06] ${className}`} />;
}

/** A responsive grid of placeholder tiles for media/card galleries. */
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-[#faf9f6] px-6 py-12 text-center">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <Frame>
      <h3 className="font-heading text-lg text-[#1a1a1a]">{title}</h3>
      {sub ? <p className="mt-2 max-w-sm text-sm text-[#6b6b6b]">{sub}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </Frame>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Frame>
      <h3 className="font-heading text-lg text-[#1a1a1a]">Something needs a moment</h3>
      <p className="mt-2 max-w-sm text-sm text-[#6b6b6b]">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-6 rounded-full border border-[#D4A853]/40 bg-[#D4A853]/10 px-5 py-2 text-sm font-medium text-[#8a6a1f] transition-colors hover:bg-[#D4A853]/20"
        >
          Try again
        </button>
      ) : null}
    </Frame>
  );
}

export function NoLocationState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      title="No workspace yet"
      sub="Create your first location to start planning content."
      action={
        onCreate ? (
          <button
            onClick={onCreate}
            className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Create a location
          </button>
        ) : undefined
      }
    />
  );
}
