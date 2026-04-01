"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps, useState } from "react";
import { PermissionSwitch } from "@/components/permission-switch";
import { Button } from "@/components/ui/button";
import {
  defaultNewRolePermissions,
  fullPermissionMatrixGroups,
  type PermissionId,
} from "@/lib/roles-permissions-matrix";

function UnderlineField({
  id,
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        id={id}
        className="mt-1.5 w-full border-0 border-b border-slate-300 bg-transparent py-2 text-base text-slate-900 placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none"
        {...props}
      />
    </div>
  );
}

function UnderlineTextarea({
  id,
  label,
  ...props
}: ComponentProps<"textarea"> & { label: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <textarea
        id={id}
        rows={4}
        className="mt-1.5 w-full resize-y border-0 border-b border-slate-300 bg-transparent py-2 text-base text-slate-900 placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none"
        {...props}
      />
    </div>
  );
}

export default function NewRolePage() {
  const router = useRouter();
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<PermissionId, boolean>>(() => ({
    ...defaultNewRolePermissions,
  }));

  const displayRoleLabel = roleName.trim() || "New role";

  const togglePermission = (id: PermissionId) => {
    setPermissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCancel = () => router.push("/roles");

  const handleSave = () => {
    router.push("/roles");
  };

  const cancelButtonClass =
    "rounded-none px-0 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-transparent hover:text-slate-900";

  return (
    <section className="p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="flex flex-wrap items-start justify-between gap-3 pb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create New Role</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Define specialized access levels and permission matrices for your support team. 
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-4">
            <Button type="button" variant="ghost" className={cancelButtonClass} onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none px-5 text-xs font-semibold uppercase tracking-wide shadow-md"
              onClick={handleSave}
            >
              Save role
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="border border-slate-200 border-l-[4px] border-l-primary bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Role Identity</h2>
            <div className="mt-6 space-y-8">
              <UnderlineField
                id="new-role-name"
                label="Role name"
                placeholder="e.g. Senior Tier 2 Technician"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                autoComplete="off"
              />
              <UnderlineTextarea
                id="new-role-description"
                label="Description"
                placeholder="Briefly describe the responsibilities associated with this role..."
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
            </div>
          </aside>

          <section className="border border-slate-200 bg-white p-5">
            <header className="border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Permissions Matrix
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Editing capabilities for{" "}
                    <span className="font-semibold text-secondary">{displayRoleLabel}</span> role
                  </p>
                </div>
              </div>
            </header>

            <div className="mt-4 space-y-4">
              {fullPermissionMatrixGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <section key={group.id} className="border-b border-slate-200 pb-4 last:border-b-0">
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="size-4 text-secondary" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                        {group.title}
                      </h3>
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
                          <div className="min-w-0">
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
                            checked={permissions[item.id] ?? false}
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
          </section>
        </div>
      </div>
    </section>
  );
}
