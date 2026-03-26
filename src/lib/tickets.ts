export type TicketPriority = "Low" | "Medium" | "High";
export type TicketStatus = "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";
export type TicketCategory =
  | "Technical"
  | "Billing"
  | "Access"
  | "Account"
  | "General";
export type Role = "L1 Support" | "L2 Support" | "Billing Team" | "Product Specialist";

export type Reply = {
  id: string;
  parentId?: string;
  visibility: "Public" | "Internal";
  author: string;
  message: string;
  createdAt: string;
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
  assignedTo: Role;
  escalated: boolean;
  replies: Reply[];
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
const USER_STORAGE_KEY = "support-ticket-app:user";

const initialTickets: Ticket[] = [
  {
    id: "TCK-0001",
    subject: "Cannot access billing invoice",
    description: "The invoice page fails to load with a timeout.",
    createdAt: "2026-01-07 17:22",
    category: "Billing",
    priority: "Medium",
    status: "Open",
    attachments: ["screenshot-invoice.png"],
    createdBy: "sara@company.com",
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
    createdBy: "james@ozdesigns.com",
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
    createdBy: "mia@acmecorp.com",
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
    createdBy: "alex@northwind.io",
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
    createdBy: "support@brightleaf.dev",
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
    createdBy: "ops@starlite.ai",
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
    createdBy: "admin@heliumlabs.com",
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
    createdBy: "qa@pixelnest.co",
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
    createdBy: "care@alpenglow.io",
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
    createdBy: "it@oakridge.group",
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
];

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
    const normalizedParsed = parsed.map((ticket) => ({
      ...ticket,
      createdAt: ticket.createdAt ?? ticket.replies?.[0]?.createdAt ?? "2026-01-07 17:22",
    }));
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
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_STORAGE_KEY);
}

export function saveCurrentUser(user: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_STORAGE_KEY, user);
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function getTicketLastActivity(ticket: Ticket) {
  return ticket.replies[ticket.replies.length - 1]?.createdAt ?? ticket.createdAt;
}
