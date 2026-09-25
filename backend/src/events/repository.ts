import { Event, CreateEventInput, EventRevisionStatus, EventStatus } from "./types";

export interface EventRepository {
  list(): Promise<Event[]>;
  getById(id: string): Promise<Event | null>;
  findBySlug(slug: string): Promise<Event | null>;
  // Given a slug that no longer belongs to any event, returns the current slug of the event it
  // used to point to (if any), so a stale link can be 301-redirected instead of 404ing.
  resolveSlugRedirect(oldSlug: string): Promise<string | null>;
  // Sets the event's slug. When it already had a different one, that previous slug is archived
  // into the redirect history first, so old links keep resolving after an explicit change.
  setSlug(id: string, slug: string): Promise<Event | null>;
  create(input: CreateEventInput): Promise<Event>;
  update(id: string, input: CreateEventInput): Promise<Event | null>;
  upsertPendingRevision(id: string, input: CreateEventInput, status: EventRevisionStatus): Promise<Event | null>;
  submitPendingRevision(id: string): Promise<Event | null>;
  rejectPendingRevision(id: string, reason: string): Promise<Event | null>;
  publishPendingRevision(id: string, publishedAt: string, publishedByUserId?: string): Promise<Event | null>;
  updateFeatured(id: string, featured: boolean): Promise<Event | null>;
  archiveEvent(id: string, archivedAt: string): Promise<Event | null>;
  unarchiveEvent(id: string): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: EventStatus, data: {
    publishedAt: string | null;
    publishedByUserId?: string | null;
    rejectionReason: string | null;
    rejectedByUserId?: string | null;
    rejectedAt?: string | null;
    publicationEndAt: string;
    featured?: boolean;
  }): Promise<Event | null>;
}
