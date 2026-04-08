import { getAccessToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-base-url";

export type ApiPermission = {
  id: number;
  name: string;
  guard_name: string;
  created_at: string | null;
};

export type ApiRole = {
  id: number;
  name: string;
  guard_name: string;
  permissions: ApiPermission[];
  created_at: string | null;
};

type ResourceListResponse<T> = {
  data: T[];
};

type ResourceResponse<T> = {
  data: T;
};

function getJsonHeaders() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to manage roles and permissions.");
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseApiError(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string; errors?: Record<string, string[]> }
    | null;

  if (payload?.errors) {
    const firstError = Object.values(payload.errors).flat()[0];
    if (firstError) return firstError;
  }

  if (payload?.message) return payload.message;
  return fallbackMessage;
}

export async function fetchPermissions() {
  const response = await fetch(`${getApiBaseUrl()}/permissions`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to load permissions."));
  }

  const payload = (await response.json()) as ResourceListResponse<ApiPermission>;
  return payload.data;
}

export async function fetchRoles() {
  const response = await fetch(`${getApiBaseUrl()}/roles`, {
    method: "GET",
    headers: getJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to load roles."));
  }

  const payload = (await response.json()) as ResourceListResponse<ApiRole>;
  return payload.data;
}

export async function createRole(input: {
  name: string;
  guard_name?: string;
  permissions?: string[];
}) {
  const response = await fetch(`${getApiBaseUrl()}/roles`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to create role."));
  }

  const payload = (await response.json()) as ResourceResponse<ApiRole>;
  return payload.data;
}

export async function updateRole(
  id: number,
  input: {
    name: string;
    guard_name?: string;
    permissions?: string[];
  }
) {
  const response = await fetch(`${getApiBaseUrl()}/roles/${id}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Unable to update role."));
  }

  const payload = (await response.json()) as ResourceResponse<ApiRole>;
  return payload.data;
}
