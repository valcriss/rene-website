import { filterEvents, EventFilters } from "../src/events/filterEvents";
import type { EventItem } from "../src/api/events";

describe("filterEvents", () => {
  const events: EventItem[] = [
    {
      id: "1",
      title: "Concert Jazz",
      content: "Une soirée dédiée au jazz.",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      image: "img",
      categoryId: "music",
      latitude: 46.97,
      longitude: 0.7,
      status: "PUBLISHED"
    },
    {
      id: "2",
      title: "Expo",
      eventStartAt: "2026-01-18T10:00:00.000Z",
      eventEndAt: "2026-01-18T12:00:00.000Z",
      venueName: "Galerie",
      city: "Tours",
      image: "img",
      categoryId: "art",
      latitude: 47,
      longitude: 0.69,
      status: "PUBLISHED"
    },
    {
      id: "3",
      title: "Festival",
      eventStartAt: "2026-01-14T08:00:00.000Z",
      eventEndAt: "2026-01-16T22:00:00.000Z",
      venueName: "Parc",
      city: "Descartes",
      image: "img",
      categoryId: "festival",
      latitude: 46.98,
      longitude: 0.71,
      status: "PUBLISHED"
    }
  ];

  const baseFilters: EventFilters = {
    search: "",
    cities: [],
    types: [],
    dateRange: { start: "", end: "" }
  };

  it("filters by search", () => {
    const result = filterEvents(events, { ...baseFilters, search: "jazz" });
    expect(result).toHaveLength(1);
  });

  it("filters by city", () => {
    const result = filterEvents(events, { ...baseFilters, cities: ["tours"] });
    expect(result).toHaveLength(1);
  });

  it("filters by type", () => {
    const result = filterEvents(events, { ...baseFilters, types: ["art"] });
    expect(result).toHaveLength(1);
  });

  it("filters by date range overlap", () => {
    const result = filterEvents(events, { ...baseFilters, dateRange: { start: "2026-01-15", end: "2026-01-15" } });
    expect(result).toHaveLength(2);
  });

  it("handles inverted date range", () => {
    const result = filterEvents(events, { ...baseFilters, dateRange: { start: "2026-01-16", end: "2026-01-14" } });
    expect(result).toHaveLength(2);
  });

  it("excludes events ending before range start", () => {
    const result = filterEvents(events, { ...baseFilters, dateRange: { start: "2026-01-19", end: "" } });
    expect(result).toHaveLength(0);
  });

  it("excludes events starting after range end", () => {
    const result = filterEvents(events, { ...baseFilters, dateRange: { start: "", end: "2026-01-13" } });
    expect(result).toHaveLength(0);
  });

  it("ignores invalid date inputs", () => {
    const result = filterEvents(events, { ...baseFilters, dateRange: { start: "invalid", end: "" } });
    expect(result).toHaveLength(3);
  });
});
