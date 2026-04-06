export type UserStatus = "Active" | "Inactive";

export type UserRole =
  | "Admin"
  | "Sub-Franchisor"
  | "Franchisee"
  | "Retailer"
  | "B2B Client"
  | "Support Team Lead";

export const userRoles: UserRole[] = [
  "Admin",
  "Sub-Franchisor",
  "Franchisee",
  "Retailer",
  "B2B Client",
  "Support Team Lead",
];

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  parentOrganizationId: string | null;
};

const USERS_STORAGE_KEY = "support-ticket-app:users";

const ORGANIZATION_IDS = {
  hq: "ORG-HQ",
  subFranchisor: "ORG-SUB-001",
  franchisee: "ORG-FRN-001",
  retailer: "ORG-RTL-001",
  b2bClient: "ORG-B2B-001",
  supportOps: "ORG-OPS-001",
} as const;

export const userStatusPillClass: Record<UserStatus, string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Inactive: "bg-slate-200 text-slate-700",
};

const initialUsers: UserRecord[] = [
  {
    id: "USR-0001",
    name: "Demo Admin",
    email: "admin@esarisari.net",
    role: "Admin",
    status: "Active",
    organizationId: ORGANIZATION_IDS.hq,
    parentOrganizationId: null,
  },
  {
    id: "USR-0002",
    name: "Sub-Franchisor Demo",
    email: "subfranchisor@esarisari.net",
    role: "Sub-Franchisor",
    status: "Active",
    organizationId: ORGANIZATION_IDS.subFranchisor,
    parentOrganizationId: ORGANIZATION_IDS.hq,
  },
  {
    id: "USR-0003",
    name: "Franchisee Demo",
    email: "franchisee@esarisari.net",
    role: "Franchisee",
    status: "Active",
    organizationId: ORGANIZATION_IDS.franchisee,
    parentOrganizationId: ORGANIZATION_IDS.subFranchisor,
  },
  {
    id: "USR-0004",
    name: "Retailer Demo",
    email: "retailer@esarisari.net",
    role: "Retailer",
    status: "Active",
    organizationId: ORGANIZATION_IDS.retailer,
    parentOrganizationId: ORGANIZATION_IDS.franchisee,
  },
  {
    id: "USR-0005",
    name: "B2B Client Demo",
    email: "b2b@esarisari.net",
    role: "B2B Client",
    status: "Active",
    organizationId: ORGANIZATION_IDS.b2bClient,
    parentOrganizationId: ORGANIZATION_IDS.franchisee,
  },
  {
    id: "USR-0006",
    name: "Support Team Lead Demo",
    email: "supportlead@esarisari.net",
    role: "Support Team Lead",
    status: "Active",
    organizationId: ORGANIZATION_IDS.supportOps,
    parentOrganizationId: ORGANIZATION_IDS.hq,
  },
];

function defaultOrganizationForRole(role: UserRole) {
  switch (role) {
    case "Admin":
      return { organizationId: ORGANIZATION_IDS.hq, parentOrganizationId: null };
    case "Sub-Franchisor":
      return {
        organizationId: ORGANIZATION_IDS.subFranchisor,
        parentOrganizationId: ORGANIZATION_IDS.hq,
      };
    case "Franchisee":
      return {
        organizationId: ORGANIZATION_IDS.franchisee,
        parentOrganizationId: ORGANIZATION_IDS.subFranchisor,
      };
    case "Retailer":
      return {
        organizationId: ORGANIZATION_IDS.retailer,
        parentOrganizationId: ORGANIZATION_IDS.franchisee,
      };
    case "B2B Client":
      return {
        organizationId: ORGANIZATION_IDS.b2bClient,
        parentOrganizationId: ORGANIZATION_IDS.franchisee,
      };
    case "Support Team Lead":
      return {
        organizationId: ORGANIZATION_IDS.supportOps,
        parentOrganizationId: ORGANIZATION_IDS.hq,
      };
  }
}

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
    const normalizedParsed = parsed.map((user) => {
      if (user.organizationId && user.parentOrganizationId !== undefined) return user;
      const fallbackOrg = defaultOrganizationForRole(user.role);
      return {
        ...user,
        organizationId: user.organizationId ?? fallbackOrg.organizationId,
        parentOrganizationId: user.parentOrganizationId ?? fallbackOrg.parentOrganizationId,
      };
    });
    const byId = new Map(normalizedParsed.map((u) => [u.id, u]));
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

export function addUser(
  input: Omit<UserRecord, "id" | "organizationId" | "parentOrganizationId"> &
    Partial<Pick<UserRecord, "organizationId" | "parentOrganizationId">>
): UserRecord {
  const existing = loadUsers();
  const nextNumber = existing.length + 1;
  const fallbackOrg = defaultOrganizationForRole(input.role);
  const user: UserRecord = {
    ...input,
    organizationId: input.organizationId ?? fallbackOrg.organizationId,
    parentOrganizationId: input.parentOrganizationId ?? fallbackOrg.parentOrganizationId,
    id: newUserId(nextNumber),
  };
  const next = [user, ...existing];
  saveUsers(next);
  return user;
}
