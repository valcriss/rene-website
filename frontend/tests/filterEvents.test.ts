import { filterEvents, EventFilters } from "../src/events/filterEvents";
import type { EventItem } from "../src/api/events";

describe("filterEvents", () => {
  const events: EventItem[] = [
    {
      id: "1",
      title: "Concert Jazz",
      content: "Une soirée dédiée au jazz.",
      image: "img",
      categoryId: "music",
      audienceId: null,
      occurrences: [
        {
          id: "occ-1",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: null,
          postalCode: null,
          city: "Descartes",
          latitude: 46.97,
          longitude: 0.7
        }
      ],
      organizerName: null,
      status: "PUBLISHED"
    },
    {
      id: "2",
      title: "Expo",
      content: null,
      image: "img",
      categoryId: "art",
      audienceId: null,
      occurrences: [
        {
          id: "occ-2",
          eventStartAt: "2026-01-18T10:00:00.000Z",
          eventEndAt: "2026-01-18T12:00:00.000Z",
          allDay: false,
          venueName: "Galerie",
          address: null,
          postalCode: null,
          city: "Tours",
          latitude: 47,
          longitude: 0.69
        }
      ],
      organizerName: null,
      status: "PUBLISHED"
    },
    {
      id: "3",
      title: "Festival",
      content: null,
      image: "img",
      categoryId: "festival",
      audienceId: null,
      occurrences: [
        {
          id: "occ-3",
          eventStartAt: "2026-01-14T08:00:00.000Z",
          eventEndAt: "2026-01-16T22:00:00.000Z",
          allDay: false,
          venueName: "Parc",
          address: null,
          postalCode: null,
          city: "Descartes",
          latitude: 46.98,
          longitude: 0.71
        }
      ],
      organizerName: null,
      status: "PUBLISHED"
    }
  ];

  const baseFilters: EventFilters = {
    search: "",
    cities: [],
    types: [],
    audiences: [],
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

  it("matches an event if any of its several occurrences satisfies the filters", () => {
    const multiOccurrenceEvent: EventItem = {
      id: "4",
      title: "Tournée",
      content: null,
      image: "img",
      categoryId: "music",
      audienceId: null,
      occurrences: [
        {
          id: "occ-4a",
          eventStartAt: "2026-02-01T20:00:00.000Z",
          eventEndAt: "2026-02-01T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: null,
          postalCode: null,
          city: "Paris",
          latitude: 48.85,
          longitude: 2.35
        },
        {
          id: "occ-4b",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: null,
          postalCode: null,
          city: "Descartes",
          latitude: 46.97,
          longitude: 0.7
        }
      ],
      organizerName: null,
      status: "PUBLISHED"
    };

    const result = filterEvents([multiOccurrenceEvent], { ...baseFilters, cities: ["descartes"] });
    expect(result).toHaveLength(1);
  });
});
