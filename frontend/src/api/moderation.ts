import type { EventItem } from "./events";

export type ModeratorRole = "MODERATOR" | "ADMIN";

const callModerationEndpoint = async <T>(
  url: string,
  role: ModeratorRole,
  body?: Record<string, unknown>
): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-role": role
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error("Action de modération impossible");
  }

  return response.json() as Promise<T>;
};

export const publishEvent = (id: string, role: ModeratorRole): Promise<EventItem> =>
  callModerationEndpoint<EventItem>(`/api/events/${id}/publish`, role);

export const rejectEvent = (
  id: string,
  role: ModeratorRole,
  rejectionReason: string
): Promise<EventItem> =>
  callModerationEndpoint<EventItem>(`/api/events/${id}/reject`, role, { rejectionReason });
