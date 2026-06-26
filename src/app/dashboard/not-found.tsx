import Link from "next/link";
import { EmptyState } from "@/components/dashboard/StateViews";

export default function DashboardNotFound() {
  return (
    <div className="pb-app flex min-h-[50vh] items-center justify-center p-6">
      <EmptyState
        title="Page not found"
        sub="The page you're looking for doesn't exist or has been moved."
        action={
          <Link href="/dashboard" className="pb-btn-primary">
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}
