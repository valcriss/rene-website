export type EventStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";

export type EventRevisionStatus = "DRAFT" | "PENDING" | "REJECTED";

export type GeolocationPrecision = "EXACT" | "APPROXIMATE" | "UNRESOLVED";

export type SocialLinkType = "FACEBOOK" | "INSTAGRAM" | "YOUTUBE" | "LINKEDIN" | "X" | "TIKTOK";

export type SocialLink = {
  type: SocialLinkType;
  url: string;
};

export type EventOccurrenceInput = {
  venueName: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  geolocationPrecision?: GeolocationPrecision;
  eventStartAt: string | null;
  eventEndAt: string | null;
  allDay: boolean | null;
};

export type EventOccurrence = EventOccurrenceInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type EventDraftInput = {
  title: string;
  content: string | null;
  image: string | null;
  imageAlt?: string | null;
  categoryId: string | null;
  audienceId: string | null;
  occurrences: EventOccurrenceInput[];
  organizerName: string | null;
  organizerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  ticketUrl?: string;
  pricingInfo?: string;
  websiteUrl?: string;
  socialLinks?: SocialLink[];
  featured?: boolean;
  seoTitleOverride?: string | null;
  seoDescriptionOverride?: string | null;
};

export type CreateEventInput = EventDraftInput & {
  createdByUserId?: string | null;
};

export type UpdateEventInput = CreateEventInput;

export type EventRevision = Omit<CreateEventInput, "occurrences"> & {
  id: string;
  eventId: string;
  createdByUserId: string | null;
  occurrences: EventOccurrence[];
  status: EventRevisionStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Event = Omit<CreateEventInput, "occurrences"> & {
  id: string;
  createdByUserId: string | null;
  occurrences: EventOccurrence[];
  slug: string | null;
  status: EventStatus;
  publishedAt: string | null;
  publicationEndAt: string;
  rejectionReason: string | null;
  archivedAt: string | null;
  pendingRevision: EventRevision | null;
  createdAt: string;
  updatedAt: string;
};

// The public contract intentionally excludes creator identity, moderation rejection reasons and
// any in-progress revision, none of which are meant to ever reach an anonymous visitor or a crawler.
export type PublicEvent = Omit<Event, "createdByUserId" | "rejectionReason" | "pendingRevision">;
