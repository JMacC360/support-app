"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { PermissionSwitch } from "@/components/permission-switch";
import { Button } from "@/components/ui/button";
import { fetchAuthenticatedUser } from "@/lib/auth";
import {
  fetchPermissions,
  fetchRoles,
  updateRole,
  type ApiPermission,
  type ApiRole,
} from "@/lib/rbac";

export default function RolesConfigurationPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionNames, setSelectedPermissionNames] = useState<Set<string>>(new Set());
  const [savedPermissionNames, setSavedPermissionNames] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [loadedRoles, loadedPermissions] = await Promise.all([
          fetchRoles(),
          fetchPermissions(),
        ]);

        if (!active) return;

        setRoles(loadedRoles);
        setPermissions(loadedPermissions);

        const initialRole = loadedRoles[0] ?? null;
        setSelectedRoleId(initialRole?.id ?? null);

        const initialPermissionNames = new Set(
          initialRole?.permissions.map((permission) => permission.name) ?? []
        );
        setSelectedPermissionNames(initialPermissionNames);
        setSavedPermissionNames(new Set(initialPermissionNames));
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load roles.");
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, ApiPermission[]>();
    for (const permission of permissions) {
      const [scope = "general"] = permission.name.split(".");
      if (!grouped.has(scope)) grouped.set(scope, []);
      grouped.get(scope)?.push(permission);
    }

    return Array.from(grouped.entries()).map(([scope, scopedPermissions]) => ({
      scope,
      permissions: [...scopedPermissions].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [permissions]);

  const hasUnsavedChanges = useMemo(() => {
    if (selectedPermissionNames.size !== savedPermissionNames.size) return true;
    for (const permissionName of selectedPermissionNames) {
      if (!savedPermissionNames.has(permissionName)) return true;
    }
    return false;
  }, [savedPermissionNames, selectedPermissionNames]);

  const handleSelectRole = (roleId: number) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;

    const nextPermissionNames = new Set(role.permissions.map((permission) => permission.name));
    setSelectedRoleId(roleId);
    setSelectedPermissionNames(nextPermissionNames);
    setSavedPermissionNames(new Set(nextPermissionNames));
    setErrorMessage(null);
  };

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

  const discardChanges = () => {
    setSelectedPermissionNames(new Set(savedPermissionNames));
  };

  const handleSaveChanges = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedRole = await updateRole(selectedRole.id, {
        name: selectedRole.name,
        guard_name: selectedRole.guard_name,
        permissions: Array.from(selectedPermissionNames),
      });

      setRoles((prev) =>
        prev.map((role) => (role.id === updatedRole.id ? updatedRole : role))
      );

      const syncedPermissionNames = new Set(
        updatedRole.permissions.map((permission) => permission.name)
      );
      setSelectedPermissionNames(syncedPermissionNames);
      setSavedPermissionNames(new Set(syncedPermissionNames));

      // Refresh current user's session permissions (important when updating their own role).
      await fetchAuthenticatedUser();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save role changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1400px] border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Loading roles and permissions...</p>
        </div>
      </section>
    );
  }

  if (errorMessage && roles.length === 0) {
    return (
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1400px] border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm text-rose-700">{errorMessage}</p>
        </div>
      </section>
    );
  }

  if (!selectedRole) {
    return (
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1400px] border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">No roles found. Create one to get started.</p>
          <div className="mt-4">
            <Button type="button" onClick={() => router.push("/roles/new")}>
              Create New Role
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="flex flex-wrap items-start justify-between gap-3 pb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Role Configuration
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Manage backend roles and assign permissions from your API.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              className="text-sm font-semibold"
              onClick={() => router.push("/roles/new")}
            >
              Create New Role
            </Button>
          </div>
        </header>

        {errorMessage ? (
          <div className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm text-rose-700">{errorMessage}</p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Available Roles</h3>
            </div>
            <div className="space-y-2">
              {roles.map((role) => {
                const active = selectedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role.id)}
                    className={`flex w-full cursor-pointer items-start justify-between border bg-white px-4 py-4 text-left transition-colors ${
                      active
                        ? "border-slate-300 border-l-[4px] border-l-primary"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-lg font-semibold text-slate-900">{role.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{`Permissions: ${role.permissions.length}`}</p>
                    </div>
                  </button>
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
                  <span className="font-semibold text-secondary">{selectedRole.name}</span> role
                </p>
                <p className="mt-1 text-xs text-slate-500">{`Guard: ${selectedRole.guard_name}`}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-40"
                  onClick={discardChanges}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  Discard Changes
                </Button>
                <Button
                  type="button"
                  className="min-w-40"
                  onClick={() => void handleSaveChanges()}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </header>

            <div className="mt-3 space-y-3">
              {groupedPermissions.map((group) => (
                <section key={group.scope} className="border-b border-slate-200 pb-4 last:border-b-0">
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="size-4 text-secondary" />
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                      {group.scope}
                    </h4>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start justify-between gap-4 border-transparent bg-white px-3 py-3"
                      >
                        <div>
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

            <div className="mt-5 border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-slate-200 text-secondary">
                  i
                </div>
                <p className="py-2 text-sm text-slate-700">
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
