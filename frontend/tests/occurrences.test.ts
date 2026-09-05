import { describe, expect, it } from "vitest";
import type { EventOccurrence } from "../src/api/events";
import {
  computePublicationEndAt,
  formatEventDateBadge,
  getEarliestOccurrence,
  getEventDateSummary,
  getEventLocationSummary,
  getGeolocationPrecision,
  hasResolvedCoordinates,
  hasSubmittableGeolocation,
  isCompleteOccurrence,
  isOccurrenceGeolocated,
  sortOccurrences
} from "../src/utils/occurrences";

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
  geolocationPrecision: "EXACT",
  ...overrides
});

describe("occurrences utils", () => {
  it("detects resolved coordinates", () => {
    expect(hasResolvedCoordinates(buildOccurrence())).toBe(true);
    expect(hasResolvedCoordinates(buildOccurrence({ latitude: null, longitude: null }))).toBe(false);
  });

  it("derives geolocation precision, defaulting to exact when resolved without an explicit value", () => {
    const legacy = buildOccurrence();
    delete legacy.geolocationPrecision;
    expect(getGeolocationPrecision(legacy)).toBe("EXACT");
    expect(getGeolocationPrecision(buildOccurrence({ latitude: null, longitude: null, geolocationPrecision: undefined }))).toBe(
      "UNRESOLVED"
    );
  });

  it("flags an occurrence as geolocated only when resolved and not unresolved", () => {
    expect(isOccurrenceGeolocated(buildOccurrence())).toBe(true);
    expect(isOccurrenceGeolocated(buildOccurrence({ geolocationPrecision: "UNRESOLVED" }))).toBe(false);
  });

  it("checks occurrence completeness", () => {
    expect(isCompleteOccurrence(buildOccurrence())).toBe(true);
    expect(isCompleteOccurrence(buildOccurrence({ city: null }))).toBe(false);
    expect(isCompleteOccurrence(buildOccurrence({ allDay: null }))).toBe(false);
  });

  it("requires at least one complete geolocated occurrence to be submittable", () => {
    expect(hasSubmittableGeolocation([])).toBe(false);
    expect(hasSubmittableGeolocation([buildOccurrence({ city: null })])).toBe(false);
    expect(hasSubmittableGeolocation([buildOccurrence({ geolocationPrecision: "UNRESOLVED", latitude: null, longitude: null })])).toBe(
      false
    );
    expect(hasSubmittableGeolocation([buildOccurrence()])).toBe(true);
  });

  it("sorts occurrences chronologically, undated last", () => {
    const later = buildOccurrence({ id: "later", eventStartAt: "2026-03-01T00:00:00.000Z" });
    const earlier = buildOccurrence({ id: "earlier", eventStartAt: "2026-01-01T00:00:00.000Z" });
    const undated = buildOccurrence({ id: "undated", eventStartAt: null });

    expect(sortOccurrences([later, undated, earlier]).map((occurrence) => occurrence.id)).toEqual([
      "earlier",
      "later",
      "undated"
    ]);
  });

  it("returns the earliest occurrence or null when there are none", () => {
    expect(getEarliestOccurrence([])).toBeNull();
    expect(getEarliestOccurrence([buildOccurrence({ id: "a" })])?.id).toBe("a");
  });

  it("summarizes event dates with an additional count", () => {
    expect(getEventDateSummary([])).toEqual({ primary: null, additionalCount: 0 });
    const summary = getEventDateSummary([buildOccurrence(), buildOccurrence({ id: "occ-2" })]);
    expect(summary.primary?.id).toBe("occ-1");
    expect(summary.additionalCount).toBe(1);
  });

  it("formats a date badge, appending the additional occurrence count", () => {
    expect(formatEventDateBadge([])).toBe("");
    expect(formatEventDateBadge([buildOccurrence()])).not.toContain("+");
    expect(formatEventDateBadge([buildOccurrence(), buildOccurrence({ id: "occ-2" })])).toContain("(+1)");
  });

  it("summarizes the event location, flagging multiple distinct cities", () => {
    expect(getEventLocationSummary([buildOccurrence()])).toBe("Salle · Descartes");
    expect(
      getEventLocationSummary([buildOccurrence(), buildOccurrence({ id: "occ-2", city: "Tours" })])
    ).toBe("Salle · Descartes (+1)");
  });

  it("computes the publication end date as the latest occurrence end, or undefined when none", () => {
    expect(computePublicationEndAt([])).toBeUndefined();
    expect(
      computePublicationEndAt([
        buildOccurrence({ eventEndAt: "2026-01-15T22:00:00.000Z" }),
        buildOccurrence({ id: "occ-2", eventEndAt: "2026-02-01T22:00:00.000Z" })
      ])
    ).toBe("2026-02-01T22:00:00.000Z");
  });
});
