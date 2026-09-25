import request from "supertest";
import { EventRepository } from "../src/events/repository";
import { authHeader } from "./authTestUtils";

// The delete route pre-fetches the event before deleting it only to decide whether a deletion
// notification is worth sending; if that lookup and the delete itself observe different
// repository states (a real race in production), the notification must be skipped rather than
// crash the request. Forcing that with the real createApp() wiring (so rate limiting, CSRF, etc.
// all stay in place) means swapping in a custom event repository, which requires mocking the
// factory the app pulls it from.
const mockEventRepoOverride: { current: EventRepository | null } = { current: null };

jest.mock("../src/events/repositoryFactory", () => {
  const { createInMemoryEventRepository } = jest.requireActual("../src/events/inMemoryRepository");
  return {
    createEventRepository: () => mockEventRepoOverride.current ?? createInMemoryEventRepository()
  };
});

const notifyEventDeletedMock = jest.fn(async () => {
  throw new Error("notifyEventDeleted should not be called once the pre-delete lookup found nothing");
});

jest.mock("../src/notifications/service", () => ({
  ...jest.requireActual("../src/notifications/service"),
  notifyEventDeleted: notifyEventDeletedMock
}));

import { createApp } from "../src/app";
import { createInMemoryEventRepository } from "../src/events/inMemoryRepository";

const validPayload = {
  title: "Concert",
  content: "Soirée jazz",
  image: "https://example.com/image.jpg",
  imageAlt: "Musiciens sur scène",
  categoryId: "music",
  audienceId: "all",
  organizerName: "Association",
  occurrences: [
    {
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle des fêtes",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes"
    }
  ]
};

describe("events routes delete notification", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    mockEventRepoOverride.current = null;
    notifyEventDeletedMock.mockClear();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    mockEventRepoOverride.current = null;
  });

  it("skips the deletion notification when the event has already vanished by the time it is looked up", async () => {
    const inMemory = createInMemoryEventRepository();
    let forceNextGetByIdNull = false;
    mockEventRepoOverride.current = {
      ...inMemory,
      getById: async (id) => {
        if (forceNextGetByIdNull) {
          forceNextGetByIdNull = false;
          return null;
        }
        return inMemory.getById(id);
      }
    };

    const app = createApp();

    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("ADMIN"))
      .send(validPayload);

    forceNextGetByIdNull = true;
    const deleteResponse = await request(app)
      .delete(`/api/events/${createResponse.body.id}`)
      .set("Authorization", authHeader("ADMIN"));

    // If the route's pre-fetch had wrongly reported the event as still present, it would have
    // called the throwing notifyEventDeletedMock and this request would have failed with a 500.
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ id: createResponse.body.id });
    expect(notifyEventDeletedMock).not.toHaveBeenCalled();
  });
});
