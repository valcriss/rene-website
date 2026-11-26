import type { EventItem } from "./events";
import { buildAuthHeaders, handleSessionExpired } from "./authHeaders";
import { authFetch } from "./authFetch";

export type ModeratorRole = "MODERATOR" | "ADMIN";
export type AdminRole = "ADMIN";

const callModerationEndpoint = async <T>(
  url: string,
  role: ModeratorRole,
  body?: Record<string, unknown>
): Promise<T> => {
  const response = await authFetch(url, {
    method: "POST",
    headers: buildAuthHeaders(role),
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    if (response.status === 401) {
      return handleSessionExpired();
    }
    throw new Error("Action de modération impossible");
  }

  return response.json() as Promise<T>;
};

export const publishEvent = (id: string, role: ModeratorRole): Promise<EventItem> =>
  callModerationEndpoint<EventItem>(`/api/events/${id}/publish`, role);

export const publishEventWithFeatured = (
  id: string,
  role: ModeratorRole,
  featured: boolean
): Promise<EventItem> => callModerationEndpoint<EventItem>(`/api/events/${id}/publish`, role, { featured });

export const archiveEvent = (id: string, role: AdminRole): Promise<EventItem> =>
  callModerationEndpoint<EventItem>(`/api/events/${id}/archive`, role);

export const unarchiveEvent = (id: string, role: AdminRole): Promise<EventItem> =>
  callModerationEndpoint<EventItem>(`/api/events/${id}/unarchive`, role);

export const rejectEvent = (
  id: string,
  role: ModeratorRole,
  rejectionReason: string
): Promise<EventItem> =>
  callModerationEndpoint<EventItem>(`/api/events/${id}/reject`, role, { rejectionReason });

export const updateEventFeatured = async (
  id: string,
  role: AdminRole,
  featured: boolean
): Promise<EventItem> => {
  const response = await authFetch(`/api/events/${id}/featured`, {
    method: "PATCH",
    headers: buildAuthHeaders(role),
    body: JSON.stringify({ featured })
  });

  if (!response.ok) {
    if (response.status === 401) {
      return handleSessionExpired();
    }
    throw new Error("Action de modération impossible");
  }

  return response.json() as Promise<EventItem>;
};
