import { describe, expect, it } from "vitest";
import { buildEventMapPins } from "../src/utils/mapPins";
import type { EventItem, EventOccurrence } from "../src/api/events";

const buildOccurrence = (overrides: Partial<EventOccurrence> = {}): EventOccurrence => ({
  id: "occ-1",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: null,
  postalCode: null,
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  ...overrides
});

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert",
  content: null,
  image: "img",
  categoryId: "music",
  audienceId: null,
  occurrences: [buildOccurrence()],
  organizerName: null,
  status: "PUBLISHED",
  ...overrides
});

describe("buildEventMapPins", () => {
  it("builds one pin per geolocated occurrence", () => {
    const event = buildEvent({
      occurrences: [
        buildOccurrence({ id: "occ-a" }),
        buildOccurrence({ id: "occ-b", city: "Tours", latitude: 47, longitude: 0.69 })
      ]
    });

    const pins = buildEventMapPins([event]);

    expect(pins).toHaveLength(2);
    expect(pins[0]).toMatchObject({ id: "1:occ-a", eventId: "1", latitude: 46.97, longitude: 0.7 });
    expect(pins[1]).toMatchObject({ id: "1:occ-b", eventId: "1", latitude: 47, longitude: 0.69 });
  });

  it("excludes occurrences without resolved coordinates", () => {
    const event = buildEvent({ occurrences: [buildOccurrence({ latitude: null, longitude: null })] });

    expect(buildEventMapPins([event])).toEqual([]);
  });

  it("uses a fallback date format when dates are invalid", () => {
    const event = buildEvent({
      occurrences: [buildOccurrence({ eventStartAt: "invalid", eventEndAt: "invalid" })]
    });

    const [pin] = buildEventMapPins([event]);
    expect(pin.tooltipHtml).toContain("Invalid");
  });

  it("renders a range separator when the occurrence spans multiple days", () => {
    const event = buildEvent({
      occurrences: [buildOccurrence({ eventStartAt: "2026-01-15T20:00:00.000Z", eventEndAt: "2026-01-16T22:00:00.000Z" })]
    });

    const [pin] = buildEventMapPins([event]);
    expect(pin.tooltipHtml).toContain("→");
  });
});
