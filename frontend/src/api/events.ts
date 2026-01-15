export type EventStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";

export type EventItem = {
  id: string;
  title: string;
  content?: string;
  image: string;
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
  address?: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
  organizerName: string;
  organizerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  ticketUrl?: string;
  websiteUrl?: string;
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
    headers: {
      "Content-Type": "application/json",
      "x-user-role": role
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Impossible de créer l'événement");
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
    headers: {
      "Content-Type": "application/json",
      "x-user-role": role
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Impossible de mettre à jour l'événement");
  }
  return response.json() as Promise<EventItem>;
};

export const submitEvent = async (id: string, role: string): Promise<EventItem> => {
  const response = await fetch(`/api/events/${id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": role
    }
  });
  if (!response.ok) {
    throw new Error("Impossible de soumettre l'événement");
  }
  return response.json() as Promise<EventItem>;
};
