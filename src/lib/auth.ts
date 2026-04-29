import { getApiBaseUrl } from "@/lib/api-base-url";

type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthApiResponse = {
  user: AuthUser;
  role_names?: string[];
  permission_names?: string[];
  access_token: string;
  token_type: string;
};

type AuthMeResponse = {
  user: AuthUser;
  role_names?: string[];
  permission_names?: string[];
};

type AuthErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  roleNames: string[];
  permissionNames: string[];
};

export const AUTH_SESSION_UPDATED_EVENT = "support-ticket-app:auth-session-updated";

const AUTH_SESSION_STORAGE_KEY = "support-ticket-app:auth-session";
const LEGACY_USER_STORAGE_KEY = "support-ticket-app:user";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isBrowser() {
  return typeof window !== "undefined";
}

function notifyAuthSessionUpdated() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT));
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthSession>;
  const user = candidate.user as Partial<AuthUser> | undefined;
  const permissionNamesCandidate = (candidate as Partial<AuthSession>).permissionNames;
  const permissionNamesValid =
    permissionNamesCandidate === undefined || Array.isArray(permissionNamesCandidate);
  return Boolean(
    typeof candidate.accessToken === "string" &&
      Array.isArray(candidate.roleNames) &&
      permissionNamesValid &&
      user &&
      typeof user.id === "number" &&
      typeof user.name === "string" &&
      typeof user.email === "string"
  );
}

function normalizeRoleNames(roleNames: string[] | undefined) {
  if (!Array.isArray(roleNames)) return [];
  return roleNames
    .filter((roleName) => typeof roleName === "string")
    .map((roleName) => roleName.trim().toLowerCase())
    .filter(Boolean);
}

function normalizePermissionNames(permissionNames: string[] | undefined) {
  if (!Array.isArray(permissionNames)) return [];
  return permissionNames
    .filter((permissionName) => typeof permissionName === "string")
    .map((permissionName) => permissionName.trim().toLowerCase())
    .filter(Boolean);
}

function parseErrorMessage(payload: AuthErrorResponse | null, fallback: string) {
  if (!payload) return fallback;
  if (payload.message && payload.message.trim().length > 0) return payload.message;
  if (payload.errors) {
    const firstError = Object.values(payload.errors).flat()[0];
    if (firstError) return firstError;
  }
  return fallback;
}

export function loadAuthSession(): AuthSession | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isAuthSession(parsed)) {
        return {
          ...parsed,
          roleNames: normalizeRoleNames(parsed.roleNames),
          permissionNames: normalizePermissionNames(parsed.permissionNames ?? []),
          user: {
            ...parsed.user,
            email: normalizeEmail(parsed.user.email),
          },
        };
      }
    } catch {
      // Ignore malformed session payload and fallback to legacy key.
    }
  }

  const legacyUser = window.localStorage.getItem(LEGACY_USER_STORAGE_KEY);
  if (!legacyUser) return null;

  const normalizedLegacyEmail = normalizeEmail(legacyUser);
  return {
    accessToken: "",
    roleNames: [],
    permissionNames: [],
    user: {
      id: 0,
      name: normalizedLegacyEmail,
      email: normalizedLegacyEmail,
    },
  };
}

export function saveAuthSession(session: AuthSession) {
  if (!isBrowser()) return;

  const normalizedSession: AuthSession = {
    ...session,
    roleNames: normalizeRoleNames(session.roleNames),
    permissionNames: normalizePermissionNames(session.permissionNames),
    user: {
      ...session.user,
      email: normalizeEmail(session.user.email),
    },
  };

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  window.localStorage.setItem(LEGACY_USER_STORAGE_KEY, normalizedSession.user.email);
  notifyAuthSessionUpdated();
}

export function clearAuthSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  notifyAuthSessionUpdated();
}

export function getAccessToken() {
  const session = loadAuthSession();
  if (!session?.accessToken) return null;
  return session.accessToken;
}

export function getAuthenticatedUserEmail() {
  const session = loadAuthSession();
  if (!session?.accessToken) return null;
  return session.user.email;
}

function roleNamesContains(roleNames: string[], target: string) {
  return roleNames.includes(target.trim().toLowerCase());
}

export function getAuthenticatedRoleNames() {
  const session = loadAuthSession();
  if (!session?.accessToken) return [];
  return session.roleNames;
}

export function getAuthenticatedPermissionNames() {
  const session = loadAuthSession();
  if (!session?.accessToken) return [];
  return session.permissionNames;
}

function permissionNamesContains(permissionNames: string[], target: string) {
  return permissionNames.includes(target.trim().toLowerCase());
}

export function hasAuthenticatedPermission(permissionName: string) {
  const permissionNames = getAuthenticatedPermissionNames();
  return permissionNamesContains(permissionNames, permissionName);
}

export function hasAnyAuthenticatedPermission(permissionNames: string[]) {
  const activePermissionNames = getAuthenticatedPermissionNames();
  return permissionNames.some((permissionName) =>
    permissionNamesContains(activePermissionNames, permissionName)
  );
}

export function isAuthenticatedAdmin() {
  const roleNames = getAuthenticatedRoleNames();
  return roleNamesContains(roleNames, "super-admin") || roleNamesContains(roleNames, "admin");
}

export function isAuthenticatedAdminForEmail(email: string | null | undefined) {
  const session = loadAuthSession();
  if (!session?.accessToken || !email) return false;
  if (normalizeEmail(session.user.email) !== normalizeEmail(email)) return false;
  return (
    roleNamesContains(session.roleNames, "super-admin") ||
    roleNamesContains(session.roleNames, "admin")
  );
}

export async function loginWithPassword(email: string, password: string) {
  const response = await fetch(`${getApiBaseUrl()}/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizeEmail(email),
      password,
    }),
  });

  const payload = (await response.json().catch(() => null)) as AuthApiResponse | AuthErrorResponse | null;

  if (!response.ok) {
    throw new Error(parseErrorMessage(payload as AuthErrorResponse | null, "Unable to sign in."));
  }

  const parsedPayload = payload as AuthApiResponse;
  if (!parsedPayload?.user?.email || !parsedPayload.access_token) {
    throw new Error("Sign in response is missing required session data.");
  }

  const session: AuthSession = {
    user: {
      id: parsedPayload.user.id,
      name: parsedPayload.user.name,
      email: normalizeEmail(parsedPayload.user.email),
    },
    accessToken: parsedPayload.access_token,
    roleNames: normalizeRoleNames(parsedPayload.role_names),
    permissionNames: normalizePermissionNames(parsedPayload.permission_names),
  };

  saveAuthSession(session);
  return session;
}

export async function fetchAuthenticatedUser() {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  const response = await fetch(`${getApiBaseUrl()}/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as
    | AuthMeResponse
    | AuthUser
    | null;

  const resolvedUser =
    payload && "user" in payload ? payload.user : ((payload as AuthUser | null) ?? null);
  const resolvedRoleNames =
    payload && "role_names" in payload
      ? normalizeRoleNames(payload.role_names)
      : loadAuthSession()?.roleNames ?? [];
  const resolvedPermissionNames =
    payload && "permission_names" in payload
      ? normalizePermissionNames(payload.permission_names)
      : loadAuthSession()?.permissionNames ?? [];

  if (!resolvedUser?.email) return null;

  const session = loadAuthSession();
  if (session) {
    saveAuthSession({
      ...session,
      user: {
        id: resolvedUser.id,
        name: resolvedUser.name,
        email: normalizeEmail(resolvedUser.email),
      },
      roleNames: resolvedRoleNames,
      permissionNames: resolvedPermissionNames,
    });
  }

  return resolvedUser;
}

export async function logoutFromBackend() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    clearAuthSession();
    return;
  }

  try {
    await fetch(`${getApiBaseUrl()}/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } finally {
    clearAuthSession();
  }
}
