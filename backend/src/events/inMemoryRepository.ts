import { randomUUID } from "node:crypto";
import { EventRepository } from "./repository";
import { CreateEventInput, Event } from "./types";

export const createInMemoryEventRepository = (): EventRepository => {
  const events = new Map<string, Event>();

  return {
    list: async () => Array.from(events.values()),
    getById: async (id) => events.get(id) ?? null,
    create: (input: CreateEventInput) => {
      const now = new Date().toISOString();
      const event: Event = {
        ...input,
        id: randomUUID(),
        status: "DRAFT",
        publishedAt: null,
        publicationEndAt: input.eventEndAt,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now
      };

      events.set(event.id, event);
      return Promise.resolve(event);
    },
    update: async (id, input) => {
      const existing = events.get(id);
      if (!existing) {
        return null;
      }
      const updated: Event = {
        ...existing,
        ...input,
        publicationEndAt: input.eventEndAt,
        updatedAt: new Date().toISOString()
      };
      events.set(id, updated);
      return updated;
    },
    updateStatus: async (id, status, data) => {
      const existing = events.get(id);
      if (!existing) {
        return null;
      }
      const updated: Event = {
        ...existing,
        status,
        publishedAt: data.publishedAt,
        rejectionReason: data.rejectionReason,
        publicationEndAt: data.publicationEndAt,
        updatedAt: new Date().toISOString()
      };
      events.set(id, updated);
      return updated;
    }
  };
};
