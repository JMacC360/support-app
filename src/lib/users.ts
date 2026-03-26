import type { Role } from "./tickets";
import { roles } from "./tickets";

export type UserStatus = "Active" | "Inactive";

/** Desk roles plus admin for user management. */
export type UserRole = "Admin" | Role;

export const userRoles: UserRole[] = ["Admin", ...roles];

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

const USERS_STORAGE_KEY = "support-ticket-app:users";

export const userStatusPillClass: Record<UserStatus, string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Inactive: "bg-slate-200 text-slate-700",
};

const initialUsers: UserRecord[] = [
  {
    id: "USR-0001",
    name: "Sara Chen",
    email: "sara@company.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: "USR-0002",
    name: "James Olsen",
    email: "james@ozdesigns.com",
    role: "L2 Support",
    status: "Active",
  },
  {
    id: "USR-0003",
    name: "Mia Rodriguez",
    email: "mia@acmecorp.com",
    role: "Product Specialist",
    status: "Inactive",
  },
  {
    id: "USR-0004",
    name: "Alex North",
    email: "alex@northwind.io",
    role: "Billing Team",
    status: "Active",
  },
  {
    id: "USR-0005",
    name: "Taylor Brooks",
    email: "support@brightleaf.dev",
    role: "L1 Support",
    status: "Active",
  },
];

export function newUserId(nextNumber: number) {
  return `USR-${String(nextNumber).padStart(4, "0")}`;
}

export function loadUsers(): UserRecord[] {
  if (typeof window === "undefined") return initialUsers;
  const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) return initialUsers;
  try {
    const parsed = JSON.parse(raw) as UserRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) return initialUsers;
    const byId = new Map(parsed.map((u) => [u.id, u]));
    for (const seed of initialUsers) {
      if (!byId.has(seed.id)) byId.set(seed.id, seed);
    }
    return Array.from(byId.values());
  } catch {
    return initialUsers;
  }
}

export function saveUsers(users: UserRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function addUser(input: Omit<UserRecord, "id">): UserRecord {
  const existing = loadUsers();
  const nextNumber = existing.length + 1;
  const user: UserRecord = { ...input, id: newUserId(nextNumber) };
  const next = [user, ...existing];
  saveUsers(next);
  return user;
}
