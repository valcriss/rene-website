import {
  getActiveCategoryIds,
  getActiveCityFacets,
  getAgendaCategoryPageStatus,
  getAgendaCityPageStatus,
  getKnownCategoryIds,
  getKnownCityFacets
} from "../src/seo/agenda";
import { EventRepository } from "../src/events/repository";
import { Event, EventOccurrence } from "../src/events/types";

const buildOccurrence = (overrides: Partial<EventOccurrence> = {}): EventOccurrence => ({
  id: "occ-1",
  venueName: null,
  address: null,
  postalCode: null,
  city: "Descartes",
  latitude: null,
  longitude: null,
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const buildEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "1",
  title: "Concert",
  content: "Soirée",
  image: null,
  createdByUserId: null,
  categoryId: "music",
  audienceId: "all",
  occurrences: [buildOccurrence()],
  organizerName: null,
  slug: "concert",
  status: "PUBLISHED",
  publishedAt: "2026-01-01T00:00:00.000Z",
  publicationEndAt: "2026-01-15T22:00:00.000Z",
  rejectionReason: null,
  archivedAt: null,
  pendingRevision: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const buildRepo = (events: Event[]): EventRepository =>
  ({
    list: async () => events
  }) as unknown as EventRepository;

describe("getKnownCityFacets / getActiveCityFacets", () => {
  it("collects distinct city slugs regardless of status for known facets", () => {
    const events = [
      buildEvent({ status: "DRAFT", occurrences: [buildOccurrence({ city: "Descartes" })] }),
      buildEvent({ id: "2", status: "PUBLISHED", occurrences: [buildOccurrence({ city: "Tours" })] })
    ];

    const known = getKnownCityFacets(events);
    expect(known).toEqual([
      { slug: "descartes", name: "Descartes" },
      { slug: "tours", name: "Tours" }
    ]);
  });

  it("only lists currently public events for active facets", () => {
    const events = [
      buildEvent({ status: "DRAFT", occurrences: [buildOccurrence({ city: "Descartes" })] }),
      buildEvent({ id: "2", status: "PUBLISHED", occurrences: [buildOccurrence({ city: "Tours" })] })
    ];

    expect(getActiveCityFacets(events)).toEqual([{ slug: "tours", name: "Tours" }]);
  });

  it("excludes an archived event from active facets even if published", () => {
    const events = [buildEvent({ archivedAt: "2026-02-01T00:00:00.000Z" })];

    expect(getActiveCityFacets(events)).toEqual([]);
    expect(getKnownCityFacets(events)).toEqual([{ slug: "descartes", name: "Descartes" }]);
  });

  it("dedupes cities that only differ by accent/case/whitespace, keeping the first-seen casing", () => {
    const events = [
      buildEvent({ occurrences: [buildOccurrence({ city: "Descartes" })] }),
      buildEvent({ id: "2", occurrences: [buildOccurrence({ city: " descartes " })] })
    ];

    expect(getKnownCityFacets(events)).toEqual([{ slug: "descartes", name: "Descartes" }]);
  });

  it("ignores occurrences with a blank or missing city", () => {
    const events = [buildEvent({ occurrences: [buildOccurrence({ city: null }), buildOccurrence({ city: "  " })] })];

    expect(getKnownCityFacets(events)).toEqual([]);
  });
});

describe("getKnownCategoryIds / getActiveCategoryIds", () => {
  it("collects distinct category ids regardless of status for known ids", () => {
    const events = [
      buildEvent({ status: "DRAFT", categoryId: "theatre" }),
      buildEvent({ id: "2", status: "PUBLISHED", categoryId: "music" })
    ];

    expect(getKnownCategoryIds(events)).toEqual(["music", "theatre"]);
  });

  it("only lists currently public events for active ids", () => {
    const events = [
      buildEvent({ status: "DRAFT", categoryId: "theatre" }),
      buildEvent({ id: "2", status: "PUBLISHED", categoryId: "music" })
    ];

    expect(getActiveCategoryIds(events)).toEqual(["music"]);
  });

  it("ignores events without a category", () => {
    expect(getKnownCategoryIds([buildEvent({ categoryId: null })])).toEqual([]);
  });
});

describe("getAgendaCityPageStatus", () => {
  it("returns 404 for a city slug that has never been used", async () => {
    const status = await getAgendaCityPageStatus(buildRepo([buildEvent()]), "paris");
    expect(status).toEqual({ status: 404, isEmpty: false });
  });

  it("returns 200, not empty, for a city with a currently active event", async () => {
    const status = await getAgendaCityPageStatus(buildRepo([buildEvent()]), "descartes");
    expect(status).toEqual({ status: 200, isEmpty: false });
  });

  it("returns 200, empty, for a known city whose only event is no longer active", async () => {
    const status = await getAgendaCityPageStatus(buildRepo([buildEvent({ status: "DRAFT" })]), "descartes");
    expect(status).toEqual({ status: 200, isEmpty: true });
  });
});

describe("getAgendaCategoryPageStatus", () => {
  it("returns 404 for a category id that has never been used", async () => {
    const status = await getAgendaCategoryPageStatus(buildRepo([buildEvent()]), "science");
    expect(status).toEqual({ status: 404, isEmpty: false });
  });

  it("returns 200, not empty, for a category with a currently active event", async () => {
    const status = await getAgendaCategoryPageStatus(buildRepo([buildEvent()]), "music");
    expect(status).toEqual({ status: 200, isEmpty: false });
  });

  it("returns 200, empty, for a known category whose only event is no longer active", async () => {
    const status = await getAgendaCategoryPageStatus(buildRepo([buildEvent({ status: "REJECTED" })]), "music");
    expect(status).toEqual({ status: 200, isEmpty: true });
  });
});
