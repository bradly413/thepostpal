import DashboardShell from "@/components/DashboardShell";
import { PlanProvider } from "@/components/dashboard/PlanProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
        <DashboardShell>{children}</DashboardShell>
      </div>
    </PlanProvider>
  );
}
