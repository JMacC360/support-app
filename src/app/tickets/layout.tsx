import { DashboardShell } from "@/app/dashboard-shell";

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
