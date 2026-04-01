"use client";

import { useRouter } from "next/navigation";
import { type ComponentType, useMemo, useState } from "react";
import { Building2, Plus, Ticket } from "lucide-react";
import { PermissionSwitch } from "@/components/permission-switch";
import { Button } from "@/components/ui/button";
import type { PermissionId } from "@/lib/roles-permissions-matrix";

type RoleItem = {
  id: string;
  label: string;
  description: string;
};

type PermissionRow = {
  id: PermissionId;
  title: string;
  description: string;
  disabled?: boolean;
};

type PermissionGroup = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  rows: PermissionRow[];
};

const roles: RoleItem[] = [
  {
    id: "admin",
    label: "Admin",
    description: "Full system access and policy management.",
  },
  {
    id: "l1-support",
    label: "L1 Support",
    description: "Level 1 support.",
  },
  {
    id: "l2-support",
    label: "L2 Support",
    description: "Level 2 support.",
  },
  {
    id: "sub-franchisor",
    label: "Sub-Franchisor",
    description: "Regional oversight and performance tracking.",
  },
  {
    id: "franchisee",
    label: "Franchisee",
    description: "Store-level support and customer resolution.",
  },
  {
    id: "retailer",
    label: "Retailer",
    description: "Basic ticket management for outlets.",
  },
  {
    id: "b2b",
    label: "B2B",
    description: "Corporate client support portal access.",
  },
  {
    id: "support",
    label: "Support",
    description: "Frontline desk and query handling.",
  },
];

const permissionGroups: PermissionGroup[] = [
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

const defaultPermissionsByRole: Record<string, Record<PermissionId, boolean>> = {
  admin: {
    ticketCreation: true,
    ticketAssignment: true,
    manageUsers: true,
    configureSettings: true,
    viewAnalytics: true,
    exportFinancialData: false,
  },
  "l1-support": {
    ticketCreation: true,
    ticketAssignment: true,
    manageUsers: false,
    configureSettings: false,
    viewAnalytics: false,
    exportFinancialData: false,
  },
  "l2-support": {
    ticketCreation: true,
    ticketAssignment: true,
    manageUsers: false,
    configureSettings: false,
    viewAnalytics: true,
    exportFinancialData: false,
  },
  "sub-franchisor": {
    ticketCreation: true,
    ticketAssignment: true,
    manageUsers: false,
    configureSettings: false,
    viewAnalytics: true,
    exportFinancialData: false,
  },
  franchisee: {
    ticketCreation: true,
    ticketAssignment: false,
    manageUsers: false,
    configureSettings: false,
    viewAnalytics: false,
    exportFinancialData: false,
  },
  retailer: {
    ticketCreation: true,
    ticketAssignment: false,
    manageUsers: false,
    configureSettings: false,
    viewAnalytics: false,
    exportFinancialData: false,
  },
  b2b: {
    ticketCreation: true,
    ticketAssignment: true,
    manageUsers: false,
    configureSettings: false,
    viewAnalytics: true,
    exportFinancialData: false,
  },
  support: {
    ticketCreation: true,
    ticketAssignment: true,
    manageUsers: false,
    configureSettings: false,
    viewAnalytics: false,
    exportFinancialData: false,
  },
};

export default function RolesConfigurationPage() {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("admin");
  const [permissionsByRole, setPermissionsByRole] = useState(defaultPermissionsByRole);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? roles[0],
    [selectedRoleId]
  );

  const currentPermissions = permissionsByRole[selectedRoleId] ?? defaultPermissionsByRole.admin;

  const togglePermission = (permissionId: PermissionId) => {
    setPermissionsByRole((prev) => ({
      ...prev,
      [selectedRoleId]: {
        ...prev[selectedRoleId],
        [permissionId]: !prev[selectedRoleId]?.[permissionId],
      },
    }));
  };

  return (
    <section className="p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="flex flex-wrap items-start justify-between gap-3 pb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Role Configuration
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Define the scope of authority across your support ecosystem with
              granular permission control.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" className="text-sm font-semibold" onClick={() => router.push("/roles/new")}>
              Create New Role
            </Button>
          </div>
        </header>

        <div className="mt-4 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Available Roles</h3>
            </div>
            <div className="space-y-2">
              {roles.map((role) => {
                const active = selectedRoleId === role.id;
                return (
                  <label
                    key={role.id}
                    htmlFor={`available-role-${role.id}`}
                    className={`flex w-full cursor-pointer items-start justify-between border bg-white px-4 py-4 text-left transition-colors ${
                      active
                        ? "border-slate-300 border-l-[4px] border-l-primary"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-lg font-semibold text-slate-900">{role.label}</p>
                      <p className="mt-1 text-sm text-slate-600">{role.description}</p>
                    </div>
                    <input
                      id={`available-role-${role.id}`}
                      type="checkbox"
                      checked={active}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoleId(role.id);
                        }
                      }}
                      className="mt-0.5 size-4 shrink-0 rounded-none border-slate-300 accent-primary"
                    />
                  </label>
                );
              })}
            </div>
          </aside>

          <section className="border border-slate-200 bg-white p-5">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="min-w-0">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Permissions Matrix
                </h3>
                <p className="text-sm text-slate-600">
                  Editing capabilities for{" "}
                  <span className="font-semibold text-secondary">{selectedRole.label}</span>{" "}
                  role
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="min-w-40">
                  Discard Changes
                </Button>
                <Button type="button" className="min-w-40">
                  Save Changes
                </Button>
              </div>
            </header>

            <div className="mt-3 space-y-3">
              {permissionGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <section key={group.id} className="border-b border-slate-200 pb-4 last:border-b-0">
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="size-4 text-secondary" />
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                        {group.title}
                      </h4>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {group.rows.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start justify-between gap-4 border px-3 py-3 ${
                            item.disabled
                              ? "border-slate-200 bg-slate-50"
                              : "border-transparent bg-white"
                          }`}
                        >
                          <div>
                            <p
                              className={`text-lg font-semibold ${
                                item.disabled ? "text-slate-500" : "text-slate-900"
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
                          </div>
                          <PermissionSwitch
                            checked={currentPermissions[item.id] ?? false}
                            disabled={item.disabled}
                            onChange={() => togglePermission(item.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="mt-5 border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-slate-200 text-secondary">
                  i
                </div>
                <p className="text-sm text-slate-700 py-2">
                  <span className="font-semibold">Pro Tip:</span> Changing permissions for a role
                  will instantly affect all users currently assigned to that role.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
