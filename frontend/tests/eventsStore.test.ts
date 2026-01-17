import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useEventsStore } from "../src/stores/events";
import { useAuthStore } from "../src/stores/auth";
import type { EventItem } from "../src/api/events";
import { deleteEvent, fetchEvents } from "../src/api/events";

vi.mock("../src/api/events", () => ({
  fetchEvents: vi.fn(),
  deleteEvent: vi.fn()
}));

vi.mock("../src/api/moderation", () => ({
  publishEvent: vi.fn(),
  rejectEvent: vi.fn()
}));

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert",
  content: "Texte",
  image: "img",
  categoryId: "music",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: "",
  postalCode: "",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  organizerName: "Org",
  status: "PUBLISHED",
  publishedAt: null,
  publicationEndAt: "2026-01-15T22:00:00.000Z",
  rejectionReason: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

describe("events store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("exposes available types from published events", () => {
    const store = useEventsStore();
    store.events = [buildEvent({ categoryId: "music" }), buildEvent({ id: "2", categoryId: "art", status: "DRAFT" })];

    expect(store.availableTypes).toEqual(["music"]);
  });

  it("formats date ranges and times", () => {
    const store = useEventsStore();

    expect(store.formatDateRange("invalid", "invalid")).toContain("Invalid");
    expect(store.formatDateRange("2026-01-15", "2026-01-16")).toContain("→");

    expect(store.formatDateTimeRange("invalid", "invalid")).toContain("Invalid");
    const sameTime = store.formatDateTimeRange("2026-01-15T20:00:00.000Z", "2026-01-15T20:00:00.000Z");
    expect(sameTime).toContain("à");

    const multiDay = store.formatDateTimeRange("2026-01-15T20:00:00.000Z", "2026-01-16T20:00:00.000Z");
    expect(multiDay).toContain("→");
  });

  it("formats datetime input with fallback", () => {
    const store = useEventsStore();

    expect(store.formatDateTimeInput("invalid")).toBe("");
    expect(store.formatDateTimeInput("2026-01-15T20:10:00.000Z")).toContain("T");
  });

  it("removes events after delete and captures errors", async () => {
    const store = useEventsStore();
    const authStore = useAuthStore();
    authStore.setRole("EDITOR");
    store.events = [buildEvent()];

    const deleteEventMock = vi.mocked(deleteEvent);
    deleteEventMock.mockResolvedValue({ id: "1" });

    await store.handleDelete("1");
    expect(store.events).toHaveLength(0);

    deleteEventMock.mockRejectedValue(new Error("Erreur suppression"));
    await store.handleDelete("1");
    expect(store.deleteError).toBe("Erreur suppression");
  });

  it("skips delete when not editor and handles unknown error", async () => {
    const store = useEventsStore();
    const authStore = useAuthStore();
    authStore.setRole("VISITOR");

    const deleteEventMock = vi.mocked(deleteEvent);
    await store.handleDelete("1");
    expect(deleteEventMock).not.toHaveBeenCalled();

    authStore.setRole("EDITOR");
    deleteEventMock.mockRejectedValue("oops");
    await store.handleDelete("1");
    expect(store.deleteError).toBe("Erreur inconnue");
  });

  it("manages rejection reasons and error getters", async () => {
    const store = useEventsStore();
    store.setRejectionReason("1", "Raison");
    expect(store.rejectionReasons["1"]).toBe("Raison");

    store.moderationError = "Erreur modération";
    store.deleteError = "Erreur suppression";
    expect(store.getModerationError()).toBe("Erreur modération");
    expect(store.getDeleteError()).toBe("Erreur suppression");

    const fetchEventsMock = vi.mocked(fetchEvents);
    fetchEventsMock.mockResolvedValue([buildEvent()]);
    await store.fetchEvents();
    expect(store.events).toHaveLength(1);
  });
});
