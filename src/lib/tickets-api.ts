import { getAccessToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-base-url";
import type { Reply, Ticket } from "@/lib/tickets";

type ApiUser = {
  id: number;
  name: string;
  email: string;
};

type ApiCategory = {
  id: number;
  name: string;
  description: string | null;
};

type ApiTicket = {
  id: number;
  subject: string;
  description: string;
  category_id: number;
  priority: string;
  attachments: string[] | null;
  created_by: number;
  assigned_to: number | null;
  status: "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";
  created_at: string;
  updated_at: string;
  owner_org_id?: string | null;
  organization_id?: string | null;
  parent_organization_id?: string | null;
  company_name?: string | null;
  creator?: ApiUser;
  assignee?: ApiUser | null;
};

type ApiTicketThread = {
  id: number;
  user_id: number;
  message: string;
  attachments: string[] | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  user?: ApiUser;
};

type ApiUsersResponse = {
  data: Array<{
    id: number;
    name: string;
    email: string;
    is_active: boolean;
  }>;
};

type ApiTicketsResponse = {
  data: ApiTicket[];
};

export type TicketCategoryOption = {
  id: number;
  name: string;
};

export type TicketAssigneeOption = {
  id: number;
  name: string;
  email: string;
};

function getJsonHeaders() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to manage tickets.");
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseApiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string; errors?: Record<string, string[]> }
    | null;
  if (payload?.errors) {
    const firstError = Object.values(payload.errors).flat()[0];
    if (firstError) return firstError;
  }
  if (payload?.message) return payload.message;
  return fallback;
}

function mapApiThreadToReply(thread: ApiTicketThread): Reply {
  const hasInternalNote = Boolean(thread.internal_notes && thread.internal_notes.trim());
  return {
    id: String(thread.id),
    visibility: hasInternalNote ? "Internal" : "Public",
    author: thread.user?.name ?? thread.user?.email ?? `User #${thread.user_id}`,
    message: hasInternalNote ? (thread.internal_notes as string) : thread.message,
    createdAt: new Date(thread.created_at).toLocaleString(),
    attachments: thread.attachments ?? [],
  };
}

function mapApiTicketToTicket(
  ticket: ApiTicket,
  categoryById: Map<number, string>,
  replies: Reply[]
): Ticket {
  const creatorLabel = ticket.creator?.name ?? ticket.creator?.email ?? `user-${ticket.created_by}`;
  const assigneeLabel = ticket.assignee?.name ?? "Unassigned";
  const ownerOrgId = ticket.owner_org_id ?? ticket.organization_id ?? "—";
  const organizationId = ticket.organization_id ?? ticket.owner_org_id ?? "—";

  return {
    id: String(ticket.id),
    subject: ticket.subject,
    description: ticket.description,
    createdAt: new Date(ticket.created_at).toLocaleString(),
    category: categoryById.get(ticket.category_id) ?? "General",
    priority: ticket.priority,
    status: ticket.status,
    attachments: ticket.attachments ?? [],
    createdBy: creatorLabel,
    ownerUserId: String(ticket.created_by),
    ownerOrgId,
    organizationId,
    parentOrganizationId: ticket.parent_organization_id ?? null,
    companyName: ticket.company_name ?? undefined,
    assignedTo: assigneeLabel,
    escalated: false,
    replies,
  };
}

export async function fetchTicketDependencies() {
  const [categoriesResponse, usersResponse] = await Promise.all([
    fetch(`${getApiBaseUrl()}/categories`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
    fetch(`${getApiBaseUrl()}/users`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
  ]);

  if (!categoriesResponse.ok) {
    throw new Error(await parseApiError(categoriesResponse, "Unable to load categories."));
  }
  if (!usersResponse.ok) {
    throw new Error(await parseApiError(usersResponse, "Unable to load users."));
  }

  const categories = ((await categoriesResponse.json()) as ApiCategory[]).map((category) => ({
    id: category.id,
    name: category.name,
  }));

  const usersPayload = (await usersResponse.json()) as ApiUsersResponse;
  const assignees = usersPayload.data
    .filter((user) => user.is_active)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

  return { categories, assignees };
}

export async function createCategory(input: { name: string; description?: string }) {
  const response = await fetch(`${getApiBaseUrl()}/categories`, {
    method: "POST",
    headers: {
      ...getJsonHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? "",
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to create category."));
  }

  const payload = (await response.json()) as ApiCategory;
  return {
    id: payload.id,
    name: payload.name,
  } as TicketCategoryOption;
}

export async function createTicket(input: {
  subject: string;
  description: string;
  categoryId: number;
  priority: string;
  assignedTo?: number | null;
}) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to create tickets.");
  }

  const formData = new FormData();
  formData.append("subject", input.subject);
  formData.append("description", input.description);
  formData.append("category_id", String(input.categoryId));
  formData.append("priority", input.priority);
  if (input.assignedTo) {
    formData.append("assigned_to", String(input.assignedTo));
  }

  const response = await fetch(`${getApiBaseUrl()}/tickets`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to create ticket."));
  }

  return (await response.json()) as ApiTicket;
}

export async function fetchTickets() {
  const [ticketsResponse, categoriesResponse] = await Promise.all([
    fetch(`${getApiBaseUrl()}/tickets`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
    fetch(`${getApiBaseUrl()}/categories`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
  ]);

  if (!ticketsResponse.ok) {
    throw new Error(await parseApiError(ticketsResponse, "Unable to load tickets."));
  }
  if (!categoriesResponse.ok) {
    throw new Error(await parseApiError(categoriesResponse, "Unable to load categories."));
  }

  const ticketsPayload = (await ticketsResponse.json()) as ApiTicketsResponse;
  const categories = (await categoriesResponse.json()) as ApiCategory[];
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));

  return ticketsPayload.data.map((ticket) => mapApiTicketToTicket(ticket, categoryById, []));
}

export async function fetchTicketDetail(ticketId: string) {
  const [ticketResponse, ticketThreadsResponse, categoriesResponse] = await Promise.all([
    fetch(`${getApiBaseUrl()}/tickets/${ticketId}`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
    fetch(`${getApiBaseUrl()}/tickets/${ticketId}/threads`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
    fetch(`${getApiBaseUrl()}/categories`, {
      method: "GET",
      headers: getJsonHeaders(),
    }),
  ]);

  if (!ticketResponse.ok) {
    throw new Error(await parseApiError(ticketResponse, "Unable to load ticket."));
  }
  if (!ticketThreadsResponse.ok) {
    throw new Error(await parseApiError(ticketThreadsResponse, "Unable to load ticket threads."));
  }
  if (!categoriesResponse.ok) {
    throw new Error(await parseApiError(categoriesResponse, "Unable to load categories."));
  }

  const apiTicket = (await ticketResponse.json()) as ApiTicket;
  const apiThreads = (await ticketThreadsResponse.json()) as ApiTicketThread[];
  const categories = (await categoriesResponse.json()) as ApiCategory[];
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const replies = apiThreads.map(mapApiThreadToReply);

  return mapApiTicketToTicket(apiTicket, categoryById, replies);
}

export async function updateTicketFields(
  ticketId: string,
  payload: {
    status?: Ticket["status"];
    priority?: string;
    categoryId?: number;
    assignedTo?: number | null;
  }
) {
  const body: Record<string, unknown> = {};
  if (payload.status) {
    const response = await fetch(`${getApiBaseUrl()}/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: {
        ...getJsonHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: payload.status }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response, "Unable to update ticket status."));
    }
    return;
  }

  if (payload.priority) body.priority = payload.priority;
  if (payload.categoryId) body.category_id = payload.categoryId;
  if (payload.assignedTo !== undefined) body.assigned_to = payload.assignedTo;

  const response = await fetch(`${getApiBaseUrl()}/tickets/${ticketId}`, {
    method: "PUT",
    headers: {
      ...getJsonHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to update ticket."));
  }
}

export async function createTicketReply(input: {
  ticketId: string;
  message: string;
  visibility: "Public" | "Internal";
  attachments?: File[];
}) {
  const hasAttachments = Boolean(input.attachments?.length);

  const response = await fetch(`${getApiBaseUrl()}/tickets/${input.ticketId}/threads`, {
    method: "POST",
    headers: hasAttachments
      ? getJsonHeaders()
      : {
          ...getJsonHeaders(),
          "Content-Type": "application/json",
        },
    body: hasAttachments
      ? (() => {
          const formData = new FormData();
          formData.append("message", input.message);
          if (input.visibility === "Internal") {
            formData.append("internal_notes", input.message);
          }
          (input.attachments ?? []).forEach((file) => {
            formData.append("attachments[]", file);
          });
          return formData;
        })()
      : JSON.stringify({
          message: input.message,
          ...(input.visibility === "Internal" ? { internal_notes: input.message } : {}),
        }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to add reply."));
  }
}

export async function updateTicketReply(input: {
  ticketId: string;
  threadId: string;
  message: string;
  visibility: "Public" | "Internal";
  attachments?: File[];
}) {
  const hasAttachments = Boolean(input.attachments?.length);

  const response = await fetch(
    `${getApiBaseUrl()}/tickets/${input.ticketId}/threads/${input.threadId}`,
    {
      method: "PUT",
      headers: hasAttachments
        ? getJsonHeaders()
        : {
            ...getJsonHeaders(),
            "Content-Type": "application/json",
          },
      body: hasAttachments
        ? (() => {
            const formData = new FormData();
            formData.append("message", input.message);
            formData.append(
              "internal_notes",
              input.visibility === "Internal" ? input.message : ""
            );
            (input.attachments ?? []).forEach((file) => {
              formData.append("attachments[]", file);
            });
            return formData;
          })()
        : JSON.stringify({
            message: input.message,
            internal_notes: input.visibility === "Internal" ? input.message : null,
          }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to update reply."));
  }
}

export async function deleteTicketReply(input: { ticketId: string; threadId: string }) {
  const response = await fetch(
    `${getApiBaseUrl()}/tickets/${input.ticketId}/threads/${input.threadId}`,
    {
      method: "DELETE",
      headers: getJsonHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to delete reply."));
  }
}
