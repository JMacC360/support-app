import { type ComponentType } from "react";
import { BarChart3, Building2, Ticket } from "lucide-react";

export type PermissionId =
  | "ticketCreation"
  | "ticketAssignment"
  | "manageUsers"
  | "configureSettings"
  | "viewAnalytics"
  | "exportFinancialData";

export type PermissionRow = {
  id: PermissionId;
  title: string;
  description: string;
  disabled?: boolean;
};

export type PermissionGroup = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  rows: PermissionRow[];
};

/** Full matrix used on Create New Role (and can be reused elsewhere). */
export const fullPermissionMatrixGroups: PermissionGroup[] = [
  {
    id: "ticket-operations",
    title: "Ticket Operations",
    icon: Ticket,
    rows: [
      {
        id: "ticketCreation",
        title: "Ticket Creation",
        description: "Allow user to open new support tickets",
      },
      {
        id: "ticketAssignment",
        title: "Ticket Assignment",
        description: "Route tickets to specific agents or teams",
      },
    ],
  },
  {
    id: "system-organization",
    title: "System & Organization",
    icon: Building2,
    rows: [
      {
        id: "manageUsers",
        title: "Manage Users",
        description: "Create users, update user info, and activate or deactivate accounts",
      },
    ],
  },
];

export const defaultNewRolePermissions: Record<PermissionId, boolean> = {
  ticketCreation: false,
  ticketAssignment: false,
  manageUsers: false,
  configureSettings: false,
  viewAnalytics: false,
  exportFinancialData: false,
};
