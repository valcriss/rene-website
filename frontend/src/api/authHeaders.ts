type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler) => {
  sessionExpiredHandler = handler;
};

// A 401 on an authenticated backoffice call means the session expired: log out and
// let the app redirect to the login screen instead of surfacing a data-loading error.
// The returned promise never resolves so the caller's normal error handling never runs
// while that redirect happens.
export const handleSessionExpired = <T>(): Promise<T> => {
  sessionExpiredHandler?.();
  return new Promise<T>(() => {});
};

export const buildAuthHeaders = (_role?: string, includeJson = true) => {
  const headers: Record<string, string> = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  const csrfCookie = typeof document === "undefined" ? undefined : document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("rene_csrf="));
  if (csrfCookie) {
    headers["X-CSRF-Token"] = decodeURIComponent(csrfCookie.slice("rene_csrf=".length));
  }

  return headers;
};
