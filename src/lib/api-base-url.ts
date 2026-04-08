export function getApiBaseUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_SUPPORT_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPPORT_API_BASE_URL.");
  }

  return apiBaseUrl.replace(/\/+$/, "");
}
