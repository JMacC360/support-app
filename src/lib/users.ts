import { getAccessToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-base-url";

export type UserStatus = "Active" | "Inactive";

type ApiRole = {
  id: number;
  name: string;
  guard_name: string;
  created_at: string | null;
};

type ApiUser = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: ApiRole[];
  role_names: string[];
  created_at: string | null;
  updated_at: string | null;
};

type ResourceListResponse<T> = {
  data: T[];
};

type ResourceResponse<T> = {
  data: T;
};

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleNames: string[];
  status: UserStatus;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export const userStatusPillClass: Record<UserStatus, string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Inactive: "bg-slate-200 text-slate-700",
};

function getJsonHeaders() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to manage users.");
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

function toUserRecord(user: ApiUser): UserRecord {
  const roleNames = user.role_names ?? user.roles.map((role) => role.name);
  const primaryRole = roleNames[0] ?? "Unassigned";

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: primaryRole,
    roleNames,
    status: user.is_active ? "Active" : "Inactive",
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

async function parseApiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  if (payload?.errors) {
    const firstError = Object.values(payload.errors).flat()[0];
    if (firstError) return firstError;
  }
  if (payload?.message) return payload.message;
  return fallback;
}

export async function fetchUsers() {
  const response = await fetch(`${getApiBaseUrl()}/users`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to load users."));
  }

  const payload = (await response.json()) as ResourceListResponse<ApiUser>;
  return payload.data.map(toUserRecord);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  roles?: string[];
  is_active?: boolean;
}) {
  const response = await fetch(`${getApiBaseUrl()}/users`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to create user."));
  }

  const payload = (await response.json()) as ResourceResponse<ApiUser>;
  return toUserRecord(payload.data);
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const response = await fetch(`${getApiBaseUrl()}/users/${userId}/status`, {
    method: "PATCH",
    headers: getJsonHeaders(),
    body: JSON.stringify({
      is_active: isActive,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to update user status."));
  }

  const payload = (await response.json()) as ResourceResponse<ApiUser>;
  return toUserRecord(payload.data);
}
