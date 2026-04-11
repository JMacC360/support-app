import {
  clearAuthSession,
  getAuthenticatedUserEmail,
  isAuthenticatedAdminForEmail,
  loadAuthSession,
  saveAuthSession,
} from "@/lib/auth";

export type TicketPriority = string;
export type TicketStatus = "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";
export type TicketCategory = string;
export type Role = string;

export type Reply = {
  id: string;
  parentId?: string;
  visibility: "Public" | "Internal";
  author: string;
  message: string;
  createdAt: string;
  attachments?: string[];
};

export type TicketActivity = {
  id: string;
  title: string;
  at: string;
  statusLabel: string;
  action?: string;
  actor?: string;
  details?: Array<{
    field: string;
    label: string;
    from: string;
    to: string;
  }>;
};

export type Ticket = {
  id: string;
  subject: string;
  description: string;
  createdAt: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  attachments: string[];
  createdBy: string;
  ownerUserId: string;
  ownerOrgId: string;
  organizationId: string;
  parentOrganizationId: string | null;
  companyName?: string;
  assignedTo: Role;
  escalated: boolean;
  escalatedToAdminAt?: string;
  escalationReason?: string;
  replies: Reply[];
  activityLog?: TicketActivity[];
};

export type AccessLevel =
  | "Admin"
  | "Sub-Franchisor"
  | "Franchisee"
  | "Retailer"
  | "B2B Client"
  | "Support Team Lead";

export type DemoAccount = {
  userId: string;
  email: string;
  password: string;
  accessLevel: AccessLevel;
  displayName: string;
  organizationId: string;
  parentOrganizationId: string | null;
};

export const categories: TicketCategory[] = [
  "Technical",
  "Billing",
  "Access",
  "Account",
  "General",
];
export const priorities: TicketPriority[] = ["Low", "Medium", "High"];
export const roles: Role[] = [
  "L1 Support",
  "L2 Support",
  "Billing Team",
  "Product Specialist",
];
export const statuses: TicketStatus[] = [
  "Open",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
];

/** Light background + label text per status (table badges & status dropdown). */
export const statusPillClass: Record<TicketStatus, string> = {
  Open: "bg-slate-100 text-slate-800",
  "In Progress": "bg-tertiary/10 text-tertiary",
  Pending: "bg-amber-100 text-amber-950",
  Resolved: "bg-primary/10 text-primary",
  Closed: "bg-zinc-200 text-zinc-800",
};

/**
 * Solid dot + bold label for ticket table. In Progress = tertiary (#5C1800); Resolved = primary (#1A365D).
 */
export const statusTableIndicator: Record<
  TicketStatus,
  { dotClass: string; labelClass: string; variant: "dot" | "dotWithCheck" }
> = {
  Open: { dotClass: "bg-slate-700", labelClass: "text-slate-800", variant: "dot" },
  "In Progress": { dotClass: "bg-tertiary", labelClass: "text-tertiary", variant: "dot" },
  Pending: { dotClass: "bg-amber-950", labelClass: "text-amber-950", variant: "dot" },
  Resolved: { dotClass: "bg-primary", labelClass: "text-primary", variant: "dotWithCheck" },
  Closed: { dotClass: "bg-zinc-600", labelClass: "text-zinc-800", variant: "dot" },
};

export const priorityPillClass: Record<TicketPriority, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-orange-100 text-orange-700",
  High: "bg-rose-100 text-rose-700",
};

/** Border matches status fill hue (tinted dropdowns only). */
export const statusTintedBorderClass: Record<TicketStatus, string> = {
  Open: "border-slate-200",
  "In Progress": "border-tertiary/30",
  Pending: "border-amber-300",
  Resolved: "border-primary/35",
  Closed: "border-zinc-300",
};

/** Border matches priority fill hue (tinted dropdowns only). */
export const priorityTintedBorderClass: Record<TicketPriority, string> = {
  Low: "border-slate-200",
  Medium: "border-orange-200",
  High: "border-rose-200",
};

const TICKETS_STORAGE_KEY = "support-ticket-app:tickets";
const DEMO_ADMIN_EMAIL = "admin@esarisari.net";
const DEMO_ADMIN_PASSWORD = "password123";
const ORG_HIERARCHY: Record<string, string | null> = {
  "ORG-HQ": null,
  "ORG-SUB-001": "ORG-HQ",
  "ORG-FRN-001": "ORG-SUB-001",
  "ORG-RTL-001": "ORG-FRN-001",
  "ORG-B2B-001": "ORG-FRN-001",
  "ORG-OPS-001": "ORG-HQ",
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    userId: "USR-0001",
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
    accessLevel: "Admin",
    displayName: "Demo Admin",
    organizationId: "ORG-HQ",
    parentOrganizationId: null,
  },
  {
    userId: "USR-0002",
    email: "subfranchisor@esarisari.net",
    password: "password123",
    accessLevel: "Sub-Franchisor",
    displayName: "Sub-Franchisor Demo",
    organizationId: "ORG-SUB-001",
    parentOrganizationId: "ORG-HQ",
  },
  {
    userId: "USR-0003",
    email: "franchisee@esarisari.net",
    password: "password123",
    accessLevel: "Franchisee",
    displayName: "Franchisee Demo",
    organizationId: "ORG-FRN-001",
    parentOrganizationId: "ORG-SUB-001",
  },
  {
    userId: "USR-0004",
    email: "retailer@esarisari.net",
    password: "password123",
    accessLevel: "Retailer",
    displayName: "Retailer Demo",
    organizationId: "ORG-RTL-001",
    parentOrganizationId: "ORG-FRN-001",
  },
  {
    userId: "USR-0005",
    email: "b2b@esarisari.net",
    password: "password123",
    accessLevel: "B2B Client",
    displayName: "B2B Client Demo",
    organizationId: "ORG-B2B-001",
    parentOrganizationId: "ORG-FRN-001",
  },
  {
    userId: "USR-0006",
    email: "supportlead@esarisari.net",
    password: "password123",
    accessLevel: "Support Team Lead",
    displayName: "Support Team Lead Demo",
    organizationId: "ORG-OPS-001",
    parentOrganizationId: "ORG-HQ",
  },
];

type SeedTicket = Omit<
  Ticket,
  "ownerUserId" | "ownerOrgId" | "organizationId" | "parentOrganizationId"
> &
  Partial<
    Pick<
      Ticket,
      | "ownerUserId"
      | "ownerOrgId"
      | "organizationId"
      | "parentOrganizationId"
      | "escalatedToAdminAt"
      | "escalationReason"
    >
  >;

function enrichTicketOwnership(ticket: SeedTicket): Ticket {
  const owner = getDemoAccountByEmail(ticket.createdBy);
  return {
    ...ticket,
    ownerUserId: ticket.ownerUserId ?? owner?.userId ?? "USR-UNKNOWN",
    ownerOrgId: ticket.ownerOrgId ?? owner?.organizationId ?? "ORG-HQ",
    organizationId: ticket.organizationId ?? owner?.organizationId ?? "ORG-HQ",
    parentOrganizationId:
      ticket.parentOrganizationId ?? owner?.parentOrganizationId ?? ORG_HIERARCHY["ORG-HQ"],
  };
}

const seedTickets: SeedTicket[] = [
  {
    id: "TCK-0001",
    subject: "Cannot access billing invoice",
    description: "The invoice page fails to load with a timeout.",
    createdAt: "2026-01-07 17:22",
    category: "Billing",
    priority: "Medium",
    status: "Open",
    attachments: ["screenshot-invoice.png"],
    createdBy: "retailer@esarisari.net",
    assignedTo: "Billing Team",
    escalated: false,
    replies: [
      {
        id: "r-1",
        visibility: "Public",
        author: "Billing Team",
        message: "We are reviewing this and will update shortly.",
        createdAt: "2026-01-17 16:10",
      },
    ],
  },
  {
    id: "TCK-0002",
    subject: "Unable to reset account password",
    description: "Password reset email never arrives.",
    createdAt: "2026-01-08 09:12",
    category: "Access",
    priority: "High",
    status: "In Progress",
    attachments: ["password-reset.png"],
    createdBy: "b2b@esarisari.net",
    assignedTo: "L2 Support",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0003",
    subject: "Dashboard widget loads slowly",
    description: "Main dashboard widgets take 12s to render.",
    createdAt: "2026-01-09 11:40",
    category: "Technical",
    priority: "Medium",
    status: "Pending",
    attachments: ["performance-log.txt"],
    createdBy: "franchisee@esarisari.net",
    assignedTo: "Product Specialist",
    escalated: false,
    replies: [
      {
        id: "r-3-1",
        visibility: "Internal",
        author: "Product Specialist",
        message: "Waiting for infra metrics from platform team.",
        createdAt: "2026-01-18 10:03",
      },
    ],
  },
  {
    id: "TCK-0004",
    subject: "Wrong tax shown on invoice",
    description: "VAT appears as 0% for EU customer profile.",
    createdAt: "2026-01-10 14:55",
    category: "Billing",
    priority: "High",
    status: "Resolved",
    attachments: ["invoice-vat.pdf"],
    createdBy: "subfranchisor@esarisari.net",
    assignedTo: "Billing Team",
    escalated: true,
    replies: [
      {
        id: "r-4-1",
        visibility: "Public",
        author: "Billing Team",
        message: "Tax profile corrected and invoice regenerated.",
        createdAt: "2026-01-19 09:21",
      },
    ],
  },
  {
    id: "TCK-0005",
    subject: "Need role update for new employee",
    description: "Please grant editor access to a new team member.",
    createdAt: "2026-01-11 08:05",
    category: "Account",
    priority: "Low",
    status: "Open",
    attachments: [],
    createdBy: "retailer@esarisari.net",
    assignedTo: "L1 Support",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0006",
    subject: "API 429 errors during sync",
    description: "Hourly sync fails with rate limit errors.",
    createdAt: "2026-01-12 16:31",
    category: "Technical",
    priority: "High",
    status: "In Progress",
    attachments: ["api-errors.log"],
    createdBy: "supportlead@esarisari.net",
    assignedTo: "L2 Support",
    escalated: false,
    replies: [
      {
        id: "r-6-1",
        visibility: "Public",
        author: "L2 Support",
        message: "Temporary retry policy applied while we tune limits.",
        createdAt: "2026-01-20 13:45",
      },
    ],
  },
  {
    id: "TCK-0007",
    subject: "Request export of archived tickets",
    description: "Need CSV export for Q4 archive.",
    createdAt: "2026-01-13 10:20",
    category: "General",
    priority: "Low",
    status: "Closed",
    attachments: [],
    createdBy: "admin@esarisari.net",
    assignedTo: "L1 Support",
    escalated: false,
    replies: [
      {
        id: "r-7-1",
        visibility: "Public",
        author: "L1 Support",
        message: "Export delivered and confirmed.",
        createdAt: "2026-01-21 15:12",
      },
    ],
  },
  {
    id: "TCK-0008",
    subject: "Mobile layout breaks on iPhone SE",
    description: "Form fields overflow on small screens.",
    createdAt: "2026-01-14 12:08",
    category: "Technical",
    priority: "Medium",
    status: "Open",
    attachments: ["iphone-se.png"],
    createdBy: "franchisee@esarisari.net",
    assignedTo: "Product Specialist",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0009",
    subject: "Need invoice copy for December",
    description: "Customer asked for duplicate invoice in PDF.",
    createdAt: "2026-01-15 09:49",
    category: "Billing",
    priority: "Low",
    status: "Pending",
    attachments: [],
    createdBy: "b2b@esarisari.net",
    assignedTo: "Billing Team",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0010",
    subject: "SAML login redirect loop",
    description: "Users are redirected back to login after SSO.",
    createdAt: "2026-01-16 18:05",
    category: "Access",
    priority: "High",
    status: "In Progress",
    attachments: ["saml-trace.txt"],
    createdBy: "subfranchisor@esarisari.net",
    assignedTo: "L2 Support",
    escalated: true,
    replies: [
      {
        id: "r-10-1",
        visibility: "Internal",
        author: "L2 Support",
        message: "Investigating IdP configuration mismatch.",
        createdAt: "2026-01-22 11:34",
      },
    ],
  },
  {
    id: "TCK-0011",
    subject: "POS terminal cannot sync end-of-day sales",
    description: "Retail terminal fails to sync after closing shift with timeout code 504.",
    createdAt: "2026-01-17 09:14",
    category: "Technical",
    priority: "High",
    status: "Open",
    attachments: ["pos-sync-error.jpg"],
    createdBy: "retailer@esarisari.net",
    assignedTo: "L2 Support",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0012",
    subject: "Need onboarding checklist for new outlet",
    description: "Requesting account and setup checklist for a newly opened branch.",
    createdAt: "2026-01-17 11:28",
    category: "Account",
    priority: "Low",
    status: "Pending",
    attachments: [],
    createdBy: "retailer@esarisari.net",
    assignedTo: "L1 Support",
    escalated: false,
    replies: [
      {
        id: "r-12-1",
        visibility: "Public",
        author: "L1 Support",
        message: "Checklist template shared. Waiting for branch details.",
        createdAt: "2026-01-17 13:02",
      },
    ],
  },
  {
    id: "TCK-0013",
    subject: "Bulk order portal showing stale inventory",
    description: "B2B catalog still shows out-of-date stock numbers after nightly sync.",
    createdAt: "2026-01-18 08:42",
    category: "Technical",
    priority: "Medium",
    status: "In Progress",
    attachments: ["inventory-mismatch.csv"],
    createdBy: "b2b@esarisari.net",
    assignedTo: "Product Specialist",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0014",
    subject: "Request duplicate billing statement",
    description: "Need a duplicate statement for January consolidated billing.",
    createdAt: "2026-01-18 15:33",
    category: "Billing",
    priority: "Low",
    status: "Resolved",
    attachments: [],
    createdBy: "b2b@esarisari.net",
    assignedTo: "Billing Team",
    escalated: false,
    replies: [
      {
        id: "r-14-1",
        visibility: "Public",
        author: "Billing Team",
        message: "Duplicate statement generated and sent to your billing contact.",
        createdAt: "2026-01-19 10:21",
      },
    ],
  },
  {
    id: "TCK-0015",
    subject: "Regional report export fails for subordinate stores",
    description: "Export action fails when including all stores under assigned franchise.",
    createdAt: "2026-01-19 09:50",
    category: "General",
    priority: "Medium",
    status: "Open",
    attachments: ["regional-export-error.png"],
    createdBy: "franchisee@esarisari.net",
    assignedTo: "Product Specialist",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0016",
    subject: "Need reset of inactive cashier account",
    description: "Cashier account became locked after too many failed login attempts.",
    createdAt: "2026-01-19 14:08",
    category: "Access",
    priority: "Medium",
    status: "Closed",
    attachments: [],
    createdBy: "franchisee@esarisari.net",
    assignedTo: "L1 Support",
    escalated: false,
    replies: [
      {
        id: "r-16-1",
        visibility: "Public",
        author: "L1 Support",
        message: "Account unlocked and temporary password issued.",
        createdAt: "2026-01-19 15:16",
      },
    ],
  },
  {
    id: "TCK-0017",
    subject: "Hierarchy mapping incorrect for newly onboarded franchisee",
    description: "A newly onboarded franchisee appears under the wrong regional tree.",
    createdAt: "2026-01-20 10:12",
    category: "Account",
    priority: "High",
    status: "Pending",
    attachments: ["hierarchy-map.pdf"],
    createdBy: "subfranchisor@esarisari.net",
    assignedTo: "L2 Support",
    escalated: true,
    escalatedToAdminAt: "2026-01-20 12:05",
    escalationReason: "Impacts multiple subordinate entities and reporting scope.",
    replies: [
      {
        id: "r-17-1",
        visibility: "Internal",
        author: "subfranchisor@esarisari.net",
        message: "Escalated to Admin due to cross-franchise impact.",
        createdAt: "2026-01-20 12:05",
      },
    ],
  },
  {
    id: "TCK-0018",
    subject: "Role policy clarification for regional agents",
    description: "Need confirmation on allowable actions for regional support users.",
    createdAt: "2026-01-20 16:37",
    category: "General",
    priority: "Low",
    status: "Open",
    attachments: [],
    createdBy: "subfranchisor@esarisari.net",
    assignedTo: "L1 Support",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0019",
    subject: "Ticket routing rule sends billing issues to wrong queue",
    description: "Billing-tagged tickets are incorrectly routed to L1 instead of Billing Team.",
    createdAt: "2026-01-21 09:02",
    category: "Billing",
    priority: "High",
    status: "In Progress",
    attachments: ["routing-rules.json"],
    createdBy: "supportlead@esarisari.net",
    assignedTo: "L2 Support",
    escalated: false,
    replies: [
      {
        id: "r-19-1",
        visibility: "Internal",
        author: "supportlead@esarisari.net",
        message: "Workaround applied while permanent routing fix is validated.",
        createdAt: "2026-01-21 10:18",
      },
    ],
  },
  {
    id: "TCK-0020",
    subject: "SLA dashboard missing escalated ticket counts",
    description: "Escalated ticket metrics are not visible in the weekly SLA snapshot.",
    createdAt: "2026-01-21 13:46",
    category: "Technical",
    priority: "Medium",
    status: "Pending",
    attachments: ["sla-dashboard.png"],
    createdBy: "supportlead@esarisari.net",
    assignedTo: "Product Specialist",
    escalated: false,
    replies: [],
  },
  {
    id: "TCK-0021",
    subject: "Barcode scanner disconnects during checkout",
    description: "Scanner randomly disconnects after 2-3 transactions and needs reconnection.",
    createdAt: "2026-01-22 09:18",
    category: "Technical",
    priority: "Medium",
    status: "Open",
    attachments: ["scanner-disconnect-log.txt"],
    createdBy: "retailer@esarisari.net",
    assignedTo: "L1 Support",
    escalated: false,
    replies: [
      {
        id: "r-21-1",
        visibility: "Public",
        author: "L1 Support",
        message: "Please share scanner firmware version and USB port type for diagnosis.",
        createdAt: "2026-01-22 09:42",
      },
    ],
  },
];

const initialTickets: Ticket[] = seedTickets.map((ticket) =>
  enrichTicketOwnership(ticket)
);

export function getAutoAssignee(category: TicketCategory, priority: TicketPriority): Role {
  if (category === "Billing") return "Billing Team";
  if (priority === "High") return "L2 Support";
  if (category === "Technical") return "Product Specialist";
  return "L1 Support";
}

export function newTicketId(nextNumber: number) {
  return `TCK-${String(nextNumber).padStart(4, "0")}`;
}

export function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return initialTickets;
  const raw = window.localStorage.getItem(TICKETS_STORAGE_KEY);
  if (!raw) return initialTickets;
  try {
    const parsed = JSON.parse(raw) as Ticket[];
    if (!Array.isArray(parsed) || parsed.length === 0) return initialTickets;
    const normalizedParsed = parsed.map((ticket) =>
      enrichTicketOwnership({
        ...ticket,
        createdAt: ticket.createdAt ?? ticket.replies?.[0]?.createdAt ?? "2026-01-07 17:22",
      })
    );
    const byId = new Map(normalizedParsed.map((ticket) => [ticket.id, ticket]));
    for (const seedTicket of initialTickets) {
      if (!byId.has(seedTicket.id)) {
        byId.set(seedTicket.id, seedTicket);
      }
    }
    return Array.from(byId.values());
  } catch {
    return initialTickets;
  }
}

export function saveTickets(tickets: Ticket[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
}

export function loadCurrentUser() {
  return getAuthenticatedUserEmail();
}

export function saveCurrentUser(user: string) {
  const normalizedEmail = normalizeUserEmail(user);
  const existingSession = loadAuthSession();

  saveAuthSession({
    accessToken: existingSession?.accessToken ?? "",
    roleNames: existingSession?.roleNames ?? [],
    user: {
      id: existingSession?.user.id ?? 0,
      name: existingSession?.user.name ?? normalizedEmail,
      email: normalizedEmail,
    },
  });
}

export function clearCurrentUser() {
  clearAuthSession();
}

export function normalizeUserEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isDemoAdmin(userEmail: string | null | undefined) {
  if (!userEmail) return false;
  if (isAuthenticatedAdminForEmail(userEmail)) return true;
  return normalizeUserEmail(userEmail) === DEMO_ADMIN_EMAIL;
}

export function isDemoAdminCredentials(email: string, password: string) {
  return (
    normalizeUserEmail(email) === DEMO_ADMIN_EMAIL &&
    password.trim() === DEMO_ADMIN_PASSWORD
  );
}

export function getDemoAccountByEmail(email: string | null | undefined) {
  if (!email) return null;
  const normalizedEmail = normalizeUserEmail(email);
  return DEMO_ACCOUNTS.find((account) => account.email === normalizedEmail) ?? null;
}

export function getAllDemoAccounts() {
  return [...DEMO_ACCOUNTS];
}

export function isValidDemoCredentials(email: string, password: string) {
  const account = getDemoAccountByEmail(email);
  if (!account) return false;
  return account.password === password.trim();
}

export function getUserAccessLevel(
  userEmail: string | null | undefined
): AccessLevel | null {
  const demoAccessLevel = getDemoAccountByEmail(userEmail)?.accessLevel ?? null;
  if (demoAccessLevel) return demoAccessLevel;

  if (isAuthenticatedAdminForEmail(userEmail)) {
    return "Admin";
  }

  return null;
}

export function getCurrentUserContext(userEmail: string | null | undefined) {
  const account = getDemoAccountByEmail(userEmail);
  if (!account) {
    const session = loadAuthSession();
    if (
      session &&
      userEmail &&
      normalizeUserEmail(session.user.email) === normalizeUserEmail(userEmail) &&
      isAuthenticatedAdminForEmail(userEmail)
    ) {
      return {
        userId: `API-${session.user.id}`,
        organizationId: "ORG-HQ",
        parentOrganizationId: null,
        accessLevel: "Admin" as AccessLevel,
        email: normalizeUserEmail(session.user.email),
        displayName: session.user.name,
      };
    }
    return null;
  }
  return {
    userId: account.userId,
    organizationId: account.organizationId,
    parentOrganizationId: account.parentOrganizationId,
    accessLevel: account.accessLevel,
    email: account.email,
    displayName: account.displayName,
  };
}

export function canCreateTickets(userEmail: string | null | undefined) {
  return Boolean(userEmail);
}

export function canAssignTickets(userEmail: string | null | undefined) {
  const accessLevel = getUserAccessLevel(userEmail);
  return accessLevel === "Admin" || accessLevel === "Support Team Lead";
}

export function canManageTicketLifecycle(userEmail: string | null | undefined) {
  const accessLevel = getUserAccessLevel(userEmail);
  return accessLevel === "Admin" || accessLevel === "Support Team Lead";
}

export function canViewInternalNotes(userEmail: string | null | undefined) {
  const accessLevel = getUserAccessLevel(userEmail);
  return accessLevel === "Admin" || accessLevel === "Support Team Lead";
}

export function canViewTicket(
  userEmail: string | null | undefined,
  ticket: Ticket
) {
  const user = getCurrentUserContext(userEmail);
  if (!user && userEmail) return true;
  if (!user) return false;
  if (user.accessLevel === "Admin" || user.accessLevel === "Support Team Lead") return true;
  if (user.accessLevel === "Retailer" || user.accessLevel === "B2B Client") {
    return ticket.ownerUserId === user.userId;
  }
  if (user.accessLevel === "Franchisee" || user.accessLevel === "Sub-Franchisor") {
    if (ticket.ownerUserId === user.userId) return true;
    return isOrganizationWithinScope(ticket.ownerOrgId, user.organizationId);
  }
  return false;
}

export function getVisibleTicketsForUser(
  userEmail: string | null | undefined,
  tickets: Ticket[]
) {
  return tickets.filter((ticket) => canViewTicket(userEmail, ticket));
}

export function getSubordinateTicketsForUser(
  userEmail: string | null | undefined,
  tickets: Ticket[]
) {
  const user = getCurrentUserContext(userEmail);
  if (!user) return [];
  if (user.accessLevel !== "Franchisee" && user.accessLevel !== "Sub-Franchisor") {
    return [];
  }
  return tickets.filter((ticket) => {
    if (ticket.ownerUserId === user.userId) return false;
    return isOrganizationWithinScope(ticket.ownerOrgId, user.organizationId);
  });
}

export function canAccessWorkspacePath(
  userEmail: string | null | undefined,
  pathname: string
) {
  const accessLevel = getUserAccessLevel(userEmail);
  if (!accessLevel) return pathname.startsWith("/tickets");
  if (pathname.startsWith("/tickets")) return true;
  if (pathname.startsWith("/users") || pathname.startsWith("/roles")) {
    return accessLevel === "Admin";
  }
  return false;
}

function isOrganizationWithinScope(candidateOrgId: string, ownerOrgId: string) {
  let cursor: string | null | undefined = candidateOrgId;
  while (cursor) {
    if (cursor === ownerOrgId) return true;
    cursor = ORG_HIERARCHY[cursor];
  }
  return false;
}

export function canEscalateTicketToAdmin(
  userEmail: string | null | undefined,
  ticket: Ticket
) {
  const user = getCurrentUserContext(userEmail);
  if (!user) return false;
  if (user.accessLevel !== "Sub-Franchisor") return false;
  if (!canViewTicket(userEmail, ticket)) return false;
  return !ticket.escalated;
}

export function getTicketLastActivity(ticket: Ticket) {
  return ticket.replies[ticket.replies.length - 1]?.createdAt ?? ticket.createdAt;
}
