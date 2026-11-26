import { buildAuthHeaders } from "./authHeaders";

export type SessionRefreshResult = "refreshed" | "expired" | "unavailable";

let inFlightRefresh: Promise<SessionRefreshResult> | null = null;
let lastSessionRefreshAt = 0;

export const getLastSessionRefreshAt = () => lastSessionRefreshAt;

// Renews the short-lived access cookie with the refresh cookie. Concurrent callers share the
// same request: the backend rotates the refresh token on every call and treats a second use of
// the previous one as theft (revoking the whole session), so it must never be sent twice.
// "unavailable" means the server couldn't be reached: the session may still be valid.
export const refreshAccessSession = (): Promise<SessionRefreshResult> => {
  if (!inFlightRefresh) {
    inFlightRefresh = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: buildAuthHeaders(undefined, false)
    })
      .then((response): SessionRefreshResult => {
        if (!response.ok) return "expired";
        lastSessionRefreshAt = Date.now();
        return "refreshed";
      })
      .catch((): SessionRefreshResult => "unavailable")
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
};

// fetch() for authenticated API calls: an expired access token (401) is renewed once and the
// request replayed, so users only get logged out when their session itself has ended. The
// replay re-reads the CSRF header because a refresh also rotates the CSRF cookie.
export const authFetch = async (url: string, init: Parameters<typeof fetch>[1] = {}): Promise<Response> => {
  const response = await fetch(url, init);
  if (response.status !== 401) {
    return response;
  }

  if ((await refreshAccessSession()) !== "refreshed") {
    return response;
  }

  const csrfHeaders = buildAuthHeaders(undefined, false);
  return fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), ...csrfHeaders }
  });
};
