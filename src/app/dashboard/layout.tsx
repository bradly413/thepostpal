import DashboardShell from "@/components/DashboardShell";
import CheckoutQueryToast from "@/components/billing/CheckoutQueryToast";
import { PlanProvider } from "@/components/dashboard/PlanProvider";
import { ActiveLocationProvider } from "@/components/dashboard/ActiveLocationProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <ActiveLocationProvider>
        <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
          <DashboardShell>{children}</DashboardShell>
          <CheckoutQueryToast />
        </div>
      </ActiveLocationProvider>
    </PlanProvider>
  );
}
