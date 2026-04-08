"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { PermissionSwitch } from "@/components/permission-switch";
import { Button } from "@/components/ui/button";
import { createRole, fetchPermissions, type ApiPermission } from "@/lib/rbac";

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
  const [availablePermissions, setAvailablePermissions] = useState<ApiPermission[]>([]);
  const [selectedPermissionNames, setSelectedPermissionNames] = useState<Set<string>>(new Set());
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayRoleLabel = roleName.trim() || "New role";

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      setIsLoadingPermissions(true);
      setErrorMessage(null);

      try {
        const permissions = await fetchPermissions();
        if (!active) return;
        setAvailablePermissions(permissions);
      } catch (error) {
        if (!active) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load permissions."
        );
      } finally {
        if (!active) return;
        setIsLoadingPermissions(false);
      }
    };

    void loadPermissions();
    return () => {
      active = false;
    };
  }, []);

  const togglePermission = (permissionName: string) => {
    setSelectedPermissionNames((prev) => {
      const next = new Set(prev);
      if (next.has(permissionName)) {
        next.delete(permissionName);
      } else {
        next.add(permissionName);
      }
      return next;
    });
  };

  const handleCancel = () => router.push("/roles");

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, ApiPermission[]>();

    for (const permission of availablePermissions) {
      const [scope = "general"] = permission.name.split(".");
      if (!grouped.has(scope)) grouped.set(scope, []);
      grouped.get(scope)?.push(permission);
    }

    return Array.from(grouped.entries()).map(([scope, permissions]) => ({
      scope,
      permissions: [...permissions].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [availablePermissions]);

  const handleSave = async () => {
    const normalizedName = roleName.trim();
    if (!normalizedName) {
      setErrorMessage("Role name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await createRole({
        name: normalizedName,
        guard_name: "api",
        permissions: Array.from(selectedPermissionNames),
      });
      router.push("/roles");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save role.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = roleName.trim().length > 0 && !isSaving;

  const saveButtonLabel = isSaving ? "Saving..." : "Save role";

  const showEmptyPermissions = !isLoadingPermissions && groupedPermissions.length === 0;
  const cancelButtonClass =
    "rounded-none px-0 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-transparent hover:text-slate-900";

  if (isLoadingPermissions) {
    return (
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1400px] border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Loading permissions...</p>
        </div>
      </section>
    );
  }

  if (errorMessage && availablePermissions.length === 0) {
    return (
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1400px] border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm text-rose-700">{errorMessage}</p>
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={() => router.push("/roles")}>
              Back to roles
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="flex flex-wrap items-start justify-between gap-3 pb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create New Role</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Define role identity and assign API permissions.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-4">
            <Button type="button" variant="ghost" className={cancelButtonClass} onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none px-5 text-xs font-semibold uppercase tracking-wide shadow-md"
              onClick={() => void handleSave()}
              disabled={!canSave}
            >
              {saveButtonLabel}
            </Button>
          </div>
        </header>

        {errorMessage ? (
          <div className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm text-rose-700">{errorMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="border border-slate-200 border-l-[4px] border-l-primary bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Role Identity</h2>
            <div className="mt-6 space-y-8">
              <UnderlineField
                id="new-role-name"
                label="Role name"
                placeholder="e.g. supervisor"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                autoComplete="off"
              />
              <UnderlineTextarea
                id="new-role-description"
                label="Description"
                placeholder="Optional notes for internal use."
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

            {showEmptyPermissions ? (
              <p className="mt-4 text-sm text-slate-500">
                No permissions found in backend yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {groupedPermissions.map((group) => (
                  <section key={group.scope} className="border-b border-slate-200 pb-4 last:border-b-0">
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className="size-4 text-secondary" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                        {group.scope}
                      </h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {group.permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start justify-between gap-4 border-transparent bg-white px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-lg font-semibold text-slate-900">{permission.name}</p>
                            <p className="mt-0.5 text-sm text-slate-600">
                              Guard: {permission.guard_name}
                            </p>
                          </div>
                          <PermissionSwitch
                            checked={selectedPermissionNames.has(permission.name)}
                            onChange={() => togglePermission(permission.name)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
