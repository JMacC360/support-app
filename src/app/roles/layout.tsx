import { DashboardShell } from "@/app/dashboard-shell";

export default function RolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
