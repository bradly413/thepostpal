"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/dashboard/StateViews";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="pb-app flex min-h-[50vh] items-center justify-center p-6">
      <ErrorState
        message="An unexpected error occurred. Please try again or contact support if the problem persists."
        onRetry={reset}
      />
    </div>
  );
}
