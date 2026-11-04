import { DashboardShell } from "@/app/dashboard-shell";

export default function LocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
