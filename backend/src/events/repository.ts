import { Event, CreateEventInput, EventStatus } from "./types";

export interface EventRepository {
  list(): Promise<Event[]>;
  getById(id: string): Promise<Event | null>;
  create(input: CreateEventInput): Promise<Event>;
  update(id: string, input: CreateEventInput): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: EventStatus, data: {
    publishedAt: string | null;
    rejectionReason: string | null;
    publicationEndAt: string;
  }): Promise<Event | null>;
}
