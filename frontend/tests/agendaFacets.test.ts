import {
  findCityBySlug,
  getActiveCategoryIds,
  getActiveCityFacets,
  getKnownCategoryIds,
  getKnownCityFacets
} from "../src/utils/agendaFacets";
import type { EventItem, EventOccurrence } from "../src/api/events";

const buildOccurrence = (overrides: Partial<EventOccurrence> = {}): EventOccurrence => ({
  id: "occ-1",
  venueName: null,
  address: null,
  postalCode: null,
  city: "Descartes",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  ...overrides
});

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert",
  content: "Soirée",
  image: null,
  categoryId: "music",
  audienceId: null,
  occurrences: [buildOccurrence()],
  organizerName: null,
  status: "PUBLISHED",
  ...overrides
});

describe("agendaFacets", () => {
  it("collects known city facets regardless of status", () => {
    const events = [
      buildEvent({ status: "DRAFT", occurrences: [buildOccurrence({ city: "Descartes" })] }),
      buildEvent({ id: "2", occurrences: [buildOccurrence({ city: "Tours" })] })
    ];

    expect(getKnownCityFacets(events)).toEqual([
      { slug: "descartes", name: "Descartes" },
      { slug: "tours", name: "Tours" }
    ]);
  });

  it("only lists currently public events as active city facets", () => {
    const events = [
      buildEvent({ status: "DRAFT", occurrences: [buildOccurrence({ city: "Descartes" })] }),
      buildEvent({ id: "2", occurrences: [buildOccurrence({ city: "Tours" })] })
    ];

    expect(getActiveCityFacets(events)).toEqual([{ slug: "tours", name: "Tours" }]);
  });

  it("excludes an archived event from active facets even if published", () => {
    const events = [buildEvent({ archivedAt: "2026-02-01T00:00:00.000Z" })];

    expect(getActiveCityFacets(events)).toEqual([]);
  });

  it("dedupes cities differing only by accent/case/whitespace", () => {
    const events = [
      buildEvent({ occurrences: [buildOccurrence({ city: "Descartes" })] }),
      buildEvent({ id: "2", occurrences: [buildOccurrence({ city: " descartes " })] })
    ];

    expect(getKnownCityFacets(events)).toEqual([{ slug: "descartes", name: "Descartes" }]);
  });

  it("resolves a slug back to its known city facet", () => {
    const events = [buildEvent()];

    expect(findCityBySlug(events, "descartes")).toEqual({ slug: "descartes", name: "Descartes" });
    expect(findCityBySlug(events, "paris")).toBeNull();
  });

  it("collects known and active category ids", () => {
    const events = [
      buildEvent({ status: "DRAFT", categoryId: "theatre" }),
      buildEvent({ id: "2", categoryId: "music" })
    ];

    expect(getKnownCategoryIds(events)).toEqual(["music", "theatre"]);
    expect(getActiveCategoryIds(events)).toEqual(["music"]);
  });
});
