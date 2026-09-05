import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useEventsStore } from "../src/stores/events";
import { useAuthStore } from "../src/stores/auth";
import type { EventItem, EventOccurrence } from "../src/api/events";
import { deleteEvent, fetchEvents } from "../src/api/events";
import { publishEventWithFeatured, updateEventFeatured } from "../src/api/moderation";

vi.mock("../src/api/events", () => ({
  fetchEvents: vi.fn(),
  deleteEvent: vi.fn()
}));

vi.mock("../src/api/moderation", () => ({
  publishEventWithFeatured: vi.fn(),
  updateEventFeatured: vi.fn(),
  rejectEvent: vi.fn()
}));

const buildOccurrence = (overrides: Partial<EventOccurrence> = {}): EventOccurrence => ({
  id: "occ-1",
  eventStartAt: "2026-01-15T00:00:00.000Z",
  eventEndAt: "2026-01-15T23:59:59.999Z",
  allDay: true,
  venueName: "Salle",
  address: "",
  postalCode: "",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  ...overrides
});

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert",
  content: "Texte",
  image: "img",
  categoryId: "music",
  audienceId: null,
  occurrences: [buildOccurrence()],
  organizerName: "Org",
  status: "PUBLISHED",
  publishedAt: null,
  publicationEndAt: "2026-01-15T23:59:59.999Z",
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

  it("exposes available cities gathered from all occurrences", () => {
    const store = useEventsStore();
    store.events = [
      buildEvent({
        occurrences: [buildOccurrence({ city: "Descartes" }), buildOccurrence({ id: "occ-2", city: "Tours" })]
      })
    ];

    expect(store.availableCities).toEqual(["Descartes", "Tours"]);
  });

  it("formats date ranges and times", () => {
    const store = useEventsStore();

    expect(store.formatDateRange("invalid", "invalid")).toContain("Invalid");
    expect(store.formatDateRange("2026-01-15", "2026-01-16")).toContain("→");

    expect(store.formatDateTimeRange("invalid", "invalid")).toContain("Invalid");
    const sameTime = store.formatDateTimeRange("2026-01-15T00:00:00.000Z", "2026-01-15T23:59:59.999Z");
    expect(sameTime).not.toContain(":");

    const multiDay = store.formatDateTimeRange("2026-01-15T00:00:00.000Z", "2026-01-16T23:59:59.999Z");
    expect(multiDay).toContain("→");
  });

  it("builds all-day calendar urls", () => {
    const store = useEventsStore();
    const event = buildEvent();
    const url = decodeURIComponent(store.buildCalendarUrl(event, event.occurrences[0]));

    expect(url).toContain("DTSTART;VALUE=DATE:20260115");
    expect(url).toContain("DTEND;VALUE=DATE:20260116");
  });

  it("builds citywide directions and calendar urls without venue", () => {
    const store = useEventsStore();
    const citywideOccurrence = buildOccurrence({
      venueName: "",
      address: "",
      postalCode: "37160",
      city: "Descartes"
    });
    const citywideEvent = buildEvent({ occurrences: [citywideOccurrence] });

    expect(decodeURIComponent(store.buildDirectionsUrl(citywideOccurrence))).toContain("destination=37160, Descartes");
    expect(decodeURIComponent(store.buildCalendarUrl(citywideEvent, citywideOccurrence))).toContain("LOCATION:37160, Descartes");
  });

  it("builds a map pin per geolocated occurrence", () => {
    const store = useEventsStore();
    const event = buildEvent({
      occurrences: [
        buildOccurrence({ id: "occ-a", latitude: 46.97, longitude: 0.7 }),
        buildOccurrence({ id: "occ-b", latitude: null, longitude: null }),
        buildOccurrence({ id: "occ-c", latitude: 47, longitude: 0.69 })
      ]
    });

    const pins = store.getEventMapPins([event]);

    expect(pins).toHaveLength(2);
    expect(pins.map((pin) => pin.id)).toEqual(["1:occ-a", "1:occ-c"]);
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

  it("publishes with featured flag and updates featured state", async () => {
    const store = useEventsStore();
    const authStore = useAuthStore();
    authStore.setRole("MODERATOR");
    store.events = [buildEvent({ id: "1", status: "PENDING", featured: false })];
    store.setFeaturedEvent("1", true);

    const publishMock = vi.mocked(publishEventWithFeatured);
    publishMock.mockResolvedValue(buildEvent({ id: "1", status: "PUBLISHED", featured: true }));

    await store.handlePublish("1");

    expect(publishMock).toHaveBeenCalledWith("1", "MODERATOR", true);
    expect(store.events[0].featured).toBe(true);
  });

  it("updates featured state on published event", async () => {
    const store = useEventsStore();
    const authStore = useAuthStore();
    authStore.setRole("ADMIN");
    store.events = [buildEvent({ id: "1", featured: false })];

    const updateFeaturedMock = vi.mocked(updateEventFeatured);
    updateFeaturedMock.mockResolvedValue(buildEvent({ id: "1", featured: true }));

    await store.handleUpdateFeatured("1", true);

    expect(updateFeaturedMock).toHaveBeenCalledWith("1", "ADMIN", true);
    expect(store.events[0].featured).toBe(true);
  });
});
