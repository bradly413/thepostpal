import { Skeleton } from "@/components/dashboard/StateViews";

export default function DashboardLoading() {
  return (
    <div className="pb-app flex min-h-[50vh] flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
