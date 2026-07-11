"use client";

import type { ReactNode } from "react";

// Shared, calm state views for the dashboard — warm-light system: frosted
// white surfaces, soft ink, brand red (#ee2532) accent, no emojis, no spinners.

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

export function PageLoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="flex min-h-[240px] w-full flex-col gap-4 p-6"
    >
      <SkeletonText className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-[24px]" />
      <Skeleton className="h-28 w-full rounded-[20px]" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl px-6 py-12 text-center shadow-[0_22px_54px_-38px_rgba(20,20,40,0.45)]">
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
      <h3 className="text-lg font-semibold text-[#1c1c1e]">{title}</h3>
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
      <h3 className="text-lg font-semibold text-[#1c1c1e]">Couldn&apos;t load this</h3>
      <p className="mt-2 max-w-sm text-sm text-[#6b6b6b]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="pb-btn-secondary mt-6 text-sm px-5 py-2"
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
            type="button"
            onClick={onCreate}
            className="pb-btn-primary text-sm px-5 py-2"
          >
            Create a location
          </button>
        ) : undefined
      }
    />
  );
}

interface LocationGateProps {
  loading: boolean;
  error: string | null;
  locationId: string | null;
  onRetry?: () => void;
  onCreate?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
}

/** Waits for active location context before rendering location-scoped content. */
export function LocationGate({
  loading,
  error,
  locationId,
  onRetry,
  onCreate,
  skeleton,
  children,
}: LocationGateProps) {
  if (loading) {
    return (
      <>
        {skeleton ?? (
          <div className="space-y-3">
            <SkeletonText className="h-10 w-48" />
            <SkeletonText className="h-32 w-full rounded-[24px]" />
          </div>
        )}
      </>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!locationId) {
    return <NoLocationState onCreate={onCreate} />;
  }

  return <>{children}</>;
}
