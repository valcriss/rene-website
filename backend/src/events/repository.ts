import { Event, CreateEventInput, EventRevisionStatus, EventStatus } from "./types";

export interface EventRepository {
  list(): Promise<Event[]>;
  getById(id: string): Promise<Event | null>;
  create(input: CreateEventInput): Promise<Event>;
  update(id: string, input: CreateEventInput): Promise<Event | null>;
  upsertPendingRevision(id: string, input: CreateEventInput, status: EventRevisionStatus): Promise<Event | null>;
  submitPendingRevision(id: string): Promise<Event | null>;
  rejectPendingRevision(id: string, reason: string): Promise<Event | null>;
  publishPendingRevision(id: string, publishedAt: string): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: EventStatus, data: {
    publishedAt: string | null;
    rejectionReason: string | null;
    publicationEndAt: string;
  }): Promise<Event | null>;
}
