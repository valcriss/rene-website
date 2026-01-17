export const TOKEN_STORAGE_KEY = "rene-auth-token";
export const USER_ID_STORAGE_KEY = "rene-auth-user-id";

export const buildAuthHeaders = (role?: string, includeJson = true) => {
  const headers: Record<string, string> = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (role) {
    headers["x-user-role"] = role;
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const userId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (userId) {
    headers["x-user-id"] = userId;
  }

  return headers;
};
