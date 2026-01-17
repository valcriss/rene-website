export type EventStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";

export type EventDraftInput = {
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
  latitude?: number;
  longitude?: number;
  organizerName: string;
  organizerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  ticketUrl?: string;
  websiteUrl?: string;
};

export type CreateEventInput = EventDraftInput & {
  latitude: number;
  longitude: number;
  createdByUserId?: string | null;
};

export type UpdateEventInput = CreateEventInput;

export type Event = CreateEventInput & {
  id: string;
  createdByUserId: string | null;
  status: EventStatus;
  publishedAt: string | null;
  publicationEndAt: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};
