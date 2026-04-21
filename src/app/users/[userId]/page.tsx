"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  LockKeyhole,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { PermissionSwitch } from "@/components/permission-switch";
import { Button } from "@/components/ui/button";
import { fetchRoles, type ApiRole } from "@/lib/rbac";
import { fetchUserById, updateUser, type UserRecord } from "@/lib/users";

const steps = [
  { id: "personal-details", label: "Personal Details", icon: User },
  { id: "login-credentials", label: "Login Credentials", icon: LockKeyhole },
  { id: "role-configuration", label: "Role Configuration", icon: BriefcaseBusiness },
  { id: "hierarchy-assignment", label: "Hierarchy Assignment", icon: Building2 },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
] as const;

function splitFullName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { firstName: "", lastName: "" };

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function formatPermissionLabel(permissionName: string) {
  return permissionName
    .split(/[._:-]/g)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleString();
}

export default function UserDetailsPage() {
  const params = useParams<{ userId: string | string[] }>();
  const router = useRouter();

  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const userId = Number(userIdParam);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [user, setUser] = useState<UserRecord | null>(null);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [rolePermissionMap, setRolePermissionMap] = useState<Record<string, Set<string>>>({});
  const [activeStep, setActiveStep] = useState<(typeof steps)[number]["id"]>(
    "personal-details"
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationSearch, setOrganizationSearch] = useState("");

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(userId) || userId <= 0) {
      setIsLoading(false);
      setErrorMessage("Invalid user id.");
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const [loadedUser, loadedRoles] = await Promise.all([fetchUserById(userId), fetchRoles()]);
        if (!active) return;

        const parsedName = splitFullName(loadedUser.name);
        const roleNames = loadedRoles.map((item) => item.name);
        const fallbackRole = loadedUser.roleNames[0] ?? roleNames[0] ?? "";

        setUser(loadedUser);
        setFirstName(parsedName.firstName);
        setLastName(parsedName.lastName);
        setEmail(loadedUser.email);
        setRoleOptions(roleNames);
        setRole(fallbackRole);
        setIsActive(loadedUser.isActive);
        setRolePermissionMap(
          loadedRoles.reduce<Record<string, Set<string>>>((acc, roleEntry: ApiRole) => {
            acc[roleEntry.name] = new Set(roleEntry.permissions.map((permission) => permission.name));
            return acc;
          }, {})
        );
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load user.");
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void load();

    const pickFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (steps.some((step) => step.id === hash)) {
        setActiveStep(hash as (typeof steps)[number]["id"]);
      }
    };
    pickFromHash();
    window.addEventListener("hashchange", pickFromHash);

    return () => {
      active = false;
      window.removeEventListener("hashchange", pickFromHash);
    };
  }, [userId]);

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.trim(),
    [firstName, lastName]
  );

  const selectedRolePermissions = useMemo(() => rolePermissionMap[role] ?? new Set<string>(), [role, rolePermissionMap]);
  const visiblePermissionNames = useMemo(
    () =>
      Array.from(selectedRolePermissions).sort((a, b) =>
        formatPermissionLabel(a).localeCompare(formatPermissionLabel(b))
      ),
    [selectedRolePermissions]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = newPassword.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim() || !normalizedEmail || !role) {
      setErrorMessage("First name, last name, email, and role are required.");
      return;
    }

    if (normalizedPassword && normalizedPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (normalizedPassword && normalizedPassword !== normalizedConfirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await updateUser(user.id, {
        name: fullName,
        email: normalizedEmail,
        roles: [role],
        is_active: isActive,
        ...(normalizedPassword
          ? {
              password: normalizedPassword,
              password_confirmation: normalizedConfirmPassword,
            }
          : {}),
      });

      const parsedName = splitFullName(updatedUser.name);
      setUser(updatedUser);
      setFirstName(parsedName.firstName);
      setLastName(parsedName.lastName);
      setEmail(updatedUser.email);
      setRole(updatedUser.roleNames[0] ?? role);
      setIsActive(updatedUser.isActive);
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("User was updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-sm text-slate-500">Loading user details...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <section className="p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[900px] border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm text-rose-700">{errorMessage ?? "Unable to find this user."}</p>
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={() => router.push("/users")}>
              Back to Users
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 lg:p-6">
      <form onSubmit={handleSubmit}>
        <div className="mx-auto grid w-full max-w-[1400px] gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="border border-slate-200 bg-white p-3 lg:sticky lg:top-6 lg:h-fit">
            <nav aria-label="Edit user sections" className="space-y-1">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <a
                    key={step.id}
                    href={`#${step.id}`}
                    onClick={() => setActiveStep(step.id)}
                    className={`flex items-center gap-2 rounded-none px-2.5 py-2 text-sm transition-colors ${
                      activeStep === step.id
                        ? "border-r-4 border-primary bg-slate-50 text-primary"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`size-4 ${activeStep === step.id ? "text-primary" : "text-slate-500"}`}
                    />
                    {step.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-4">
            <header className="border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Edit User
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    Update user account profile, credentials, access role, and account status.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/users")}
                  >
                    Discard
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </header>

            {errorMessage ? (
              <div className="border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm text-rose-700">{errorMessage}</p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            ) : null}

            <section id="personal-details" className="border border-slate-200 bg-white">
              <div className="px-4 py-5 sm:px-6 sm:py-6">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <User className="size-4" />
                  <h3 className="text-xl font-semibold tracking-tight text-primary">
                    Personal Details
                  </h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-user-first-name"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      First Name *
                    </label>
                    <input
                      id="edit-user-first-name"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="e.g. Jonathan"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-user-last-name"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Last Name *
                    </label>
                    <input
                      id="edit-user-last-name"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="e.g. Wick"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            <section id="login-credentials" className="border border-slate-200 bg-white p-4">
              <div className="pt-1">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <LockKeyhole className="size-4" />
                  <h3 className="text-xl font-semibold">Login Credentials</h3>
                </div>
                <p className="mb-4 text-sm text-slate-600">
                  Email is used as the username for sign in. Leave password fields empty
                  to keep the current password.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="edit-user-email"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Email Address *
                    </label>
                    <input
                      id="edit-user-email"
                      type="email"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="j.wick@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-user-password"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      New Password
                    </label>
                    <input
                      id="edit-user-password"
                      type="password"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter new password"
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-user-password-confirmation"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="edit-user-password-confirmation"
                      type="password"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter new password"
                      minLength={8}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section id="role-configuration" className="border border-slate-200 bg-white p-4">
              <div className="pt-1">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <BriefcaseBusiness className="size-4" />
                  <h3 className="text-xl font-semibold">Role Configuration</h3>
                </div>
                <p className="mb-4 text-sm text-slate-600">
                  Assigning a role determines the user&apos;s primary workspace and
                  default view permissions.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-user-role"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Access Level *
                    </label>
                    <select
                      id="edit-user-role"
                      className="w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      required
                    >
                      {roleOptions.map((roleName) => (
                        <option key={roleName} value={roleName}>
                          {roleName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-user-status"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Account Status
                    </label>
                    <select
                      id="edit-user-status"
                      className="w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={isActive ? "active" : "inactive"}
                      onChange={(event) => setIsActive(event.target.value === "active")}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="hierarchy-assignment"
              className="border border-slate-200 bg-white p-4"
            >
              <div className="pt-1">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <Building2 className="size-4" />
                  <h3 className="text-xl font-semibold">Hierarchy Assignment</h3>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-user-org-search"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Parent Organization / Franchise
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                    <input
                      id="edit-user-org-search"
                      className="w-full rounded-none border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
                      value={organizationSearch}
                      onChange={(event) => setOrganizationSearch(event.target.value)}
                      placeholder="Search franchise or B2B client name..."
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-none border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-slate-300"
                  >
                    Global Retail Group
                  </button>
                  <button
                    type="button"
                    className="rounded-none border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-slate-300"
                  >
                    North Coast Franchise
                  </button>
                </div>
              </div>
            </section>

            <section id="permissions" className="border border-slate-200 bg-white p-4">
              <div className="pt-1">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="size-4" />
                  <h3 className="text-xl font-semibold">Permissions</h3>
                </div>
                <div className="space-y-2">
                  {visiblePermissionNames.length === 0 ? (
                    <p className="border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                      No enabled permissions for this role.
                    </p>
                  ) : (
                    visiblePermissionNames.map((permissionName) => (
                      <div
                        key={permissionName}
                        className="flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2.5"
                      >
                        <span className="text-sm text-slate-700">
                          {formatPermissionLabel(permissionName)}
                        </span>
                        <PermissionSwitch
                          checked
                          onChange={() => {}}
                          disabled
                          keepCheckedColorWhenDisabled
                        />
                      </div>
                    ))
                  )}
                </div>
                <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Showing enabled permissions for selected role
                </p>
              </div>
            </section>

            <section className="border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Account Metadata
              </h3>
              <dl className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    User ID
                  </dt>
                  <dd className="mt-1 tabular-nums">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </dt>
                  <dd className="mt-1">{formatTimestamp(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1">{formatTimestamp(user.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </form>
    </section>
  );
}
