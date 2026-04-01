import { DashboardShell } from "@/app/dashboard-shell";

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
