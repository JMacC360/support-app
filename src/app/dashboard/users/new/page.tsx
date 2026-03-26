"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  LockKeyhole,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { addUser, userRoles, type UserRole } from "@/lib/users";

const steps = [
  { id: "personal-details", label: "Personal Details", icon: User },
  { id: "login-credentials", label: "Login Credentials", icon: LockKeyhole },
  { id: "role-configuration", label: "Role Configuration", icon: BriefcaseBusiness },
  { id: "hierarchy-assignment", label: "Hierarchy Assignment", icon: Building2 },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
] as const;

type PermissionKey =
  | "viewFinancialReports"
  | "manageSupportTickets"
  | "globalSystemSettings";

const permissionLabels: Record<PermissionKey, string> = {
  viewFinancialReports: "Allow user to open new support tickets",
  manageSupportTickets: "Route tickets to specific agents or teams",
  globalSystemSettings: "Invite, suspend, or delete team members",
};

export default function NewUserPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<(typeof steps)[number]["id"]>(
    "personal-details"
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("L1 Support");
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    viewFinancialReports: true,
    manageSupportTickets: true,
    globalSystemSettings: false,
  });

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const username = email.trim().toLowerCase();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !temporaryPassword.trim() ||
      temporaryPassword !== confirmPassword
    ) {
      return;
    }
    addUser({
      name: fullName,
      email: username,
      role,
      status: "Active",
    });
    router.push("/dashboard/users");
  };

  const togglePermission = (key: PermissionKey) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const pickFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (steps.some((step) => step.id === hash)) {
        setActiveStep(hash as (typeof steps)[number]["id"]);
      }
    };
    pickFromHash();
    window.addEventListener("hashchange", pickFromHash);
    return () => window.removeEventListener("hashchange", pickFromHash);
  }, []);

  return (
    <section className="p-4 lg:p-6">
      <form onSubmit={handleSubmit}>
        <div className="mx-auto grid w-full max-w-[1400px] gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="border border-slate-200 bg-white p-3 lg:sticky lg:top-6 lg:h-fit">
            <nav aria-label="Add user sections" className="space-y-1">
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
                    Add New User
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    Provision a new account within the support workspace. All fields
                    marked with an asterisk are required.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/users")}
                  >
                    Discard
                  </Button>
                  <Button type="submit">Save User</Button>
                </div>
              </div>
            </header>

            <section
              id="personal-details"
              className="border border-slate-200 bg-white"
            >
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
                      htmlFor="new-user-first-name"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      First Name *
                    </label>
                    <input
                      id="new-user-first-name"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Jonathan"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-user-last-name"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Last Name *
                    </label>
                    <input
                      id="new-user-last-name"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Wick"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              id="login-credentials"
              className="border border-slate-200 bg-white p-4"
            >
              <div className="pt-1">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <LockKeyhole className="size-4" />
                  <h3 className="text-xl font-semibold">Login Credentials</h3>
                </div>
                <p className="mb-4 text-sm text-slate-600">
                  Email is used as the username for sign in. Set a temporary password
                  that the user can change after first login.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="new-user-email"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Email Address *
                    </label>
                    <input
                      id="new-user-email"
                      type="email"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="j.wick@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-user-temp-password"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Temporary Password *
                    </label>
                    <input
                      id="new-user-temp-password"
                      type="password"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700"
                      autoComplete="new-password"
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
                      placeholder="Enter temporary password"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-user-confirm-password"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Confirm Password *
                    </label>
                    <input
                      id="new-user-confirm-password"
                      type="password"
                      className="h-11 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-700"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter temporary password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              id="role-configuration"
              className="border border-slate-200 bg-white p-4"
            >
              <div className="pt-1">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <BriefcaseBusiness className="size-4" />
                  <h3 className="text-xl font-semibold">Role Configuration</h3>
                </div>
                <p className="mb-4 text-sm text-slate-600">
                  Assigning a role determines the user&apos;s primary workspace and
                  default view permissions.
                </p>
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-user-role"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    Access Level
                  </label>
                  <select
                    id="new-user-role"
                    className="w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    {userRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
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
                    htmlFor="org-search"
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
                      id="org-search"
                      className="w-full rounded-none border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
                      value={organizationSearch}
                      onChange={(e) => setOrganizationSearch(e.target.value)}
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

            <section
              id="permissions"
              className="border border-slate-200 bg-white p-4"
            >
              <div className="pt-1">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="size-4" />
                  <h3 className="text-xl font-semibold">Permissions</h3>
                </div>
                <div className="space-y-2">
                  {(Object.keys(permissionLabels) as PermissionKey[]).map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <span className="text-sm text-slate-700">{permissionLabels[key]}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={permissions[key]}
                        onClick={() => togglePermission(key)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-none border transition-colors ${
                          permissions[key]
                            ? "border-blue-700 bg-blue-700"
                            : "border-slate-300 bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block size-3.5 transform bg-white transition-transform ${
                            permissions[key] ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Permissions based on selected role
                </p>
              </div>
            </section>
          </div>
        </div>
      </form>
    </section>
  );
}
