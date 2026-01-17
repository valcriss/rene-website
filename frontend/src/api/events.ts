import { buildAuthHeaders } from "./authHeaders";

export type EventStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";

export type EventItem = {
  id: string;
  title: string;
  content?: string;
  image: string;
  createdByUserId?: string | null;
  categoryId: string;
  eventStartAt: string;
  eventEndAt: string;
  allDay?: boolean;
  venueName: string;
  address?: string;
  postalCode?: string;
  city: string;
  latitude: number;
  longitude: number;
  organizerName?: string;
  organizerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  ticketUrl?: string;
  websiteUrl?: string;
  status: EventStatus;
  publishedAt?: string | null;
  publicationEndAt?: string;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEventPayload = {
  title: string;
  content: string;
  image: string;
  categoryId: string;
  eventStartAt: string;
  eventEndAt: string;
  allDay: boolean;
  venueName: string;
  address: string;
  postalCode: string;
  city: string;
  organizerName: string;
  organizerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  ticketUrl?: string;
  websiteUrl?: string;
};

const parseApiError = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { errors?: string[]; message?: string };
    if (data.errors && data.errors.length > 0) {
      return data.errors.join(" · ");
    }
    if (data.message) {
      return data.message;
    }
  } catch {
    // ignore parsing errors
  }
  return fallback;
};

export const fetchEvents = async (): Promise<EventItem[]> => {
  const response = await fetch("/api/events");
  if (!response.ok) {
    throw new Error("Impossible de charger les événements");
  }
  return response.json() as Promise<EventItem[]>;
};

export const createEvent = async (payload: CreateEventPayload, role: string): Promise<EventItem> => {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: buildAuthHeaders(role),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Impossible de créer l'événement"));
  }
  return response.json() as Promise<EventItem>;
};

export const updateEvent = async (
  id: string,
  payload: CreateEventPayload,
  role: string
): Promise<EventItem> => {
  const response = await fetch(`/api/events/${id}`, {
    method: "PUT",
    headers: buildAuthHeaders(role),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Impossible de mettre à jour l'événement"));
  }
  return response.json() as Promise<EventItem>;
};

export const submitEvent = async (id: string, role: string): Promise<EventItem> => {
  const response = await fetch(`/api/events/${id}/submit`, {
    method: "POST",
    headers: buildAuthHeaders(role)
  });
  if (!response.ok) {
    throw new Error("Impossible de soumettre l'événement");
  }
  return response.json() as Promise<EventItem>;
};

export const deleteEvent = async (id: string, role: string): Promise<{ id: string }> => {
  const response = await fetch(`/api/events/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(role)
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Impossible de supprimer l'événement"));
  }
  return response.json() as Promise<{ id: string }>;
};
