import { buildEventSlugBase, generateUniqueEventSlug, slugify } from "../src/events/slug";
import type { EventOccurrenceInput } from "../src/events/types";

const occurrence = (overrides: Partial<EventOccurrenceInput> = {}): EventOccurrenceInput => ({
  venueName: null,
  address: null,
  postalCode: null,
  city: null,
  latitude: null,
  longitude: null,
  eventStartAt: null,
  eventEndAt: null,
  allDay: null,
  ...overrides
});

describe("slugify", () => {
  it("strips accents", () => {
    expect(slugify("Été à Descartes")).toBe("ete-a-descartes");
  });

  it("removes apostrophes and punctuation", () => {
    expect(slugify("L'orchestre national, ça déménage !")).toBe("l-orchestre-national-ca-demenage");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Concert--  ")).toBe("concert");
  });
});

describe("buildEventSlugBase", () => {
  it("combines title, city and year from the earliest dated occurrence", () => {
    const base = buildEventSlugBase("Concert de jazz", [
      occurrence({ city: "Descartes", eventStartAt: "2026-06-01T20:00:00.000Z" })
    ]);

    expect(base).toBe("concert-de-jazz-descartes-2026");
  });

  it("picks the earliest occurrence among several dated ones", () => {
    const base = buildEventSlugBase("Festival", [
      occurrence({ city: "Descartes", eventStartAt: "2026-06-01T20:00:00.000Z" }),
      occurrence({ city: "Tours", eventStartAt: "2026-01-15T20:00:00.000Z" })
    ]);

    expect(base).toBe("festival-tours-2026");
  });

  it("skips occurrences without a start date when picking the earliest one", () => {
    const base = buildEventSlugBase("Festival", [
      occurrence({ city: "Sans-date" }),
      occurrence({ city: "Descartes", eventStartAt: "2026-06-01T20:00:00.000Z" })
    ]);

    expect(base).toBe("festival-descartes-2026");
  });

  it("falls back to the title alone with no occurrence", () => {
    expect(buildEventSlugBase("Lecture publique", [])).toBe("lecture-publique");
  });

  it("falls back to the title alone when the occurrence has no city", () => {
    expect(buildEventSlugBase("Lecture publique", [occurrence({ eventStartAt: "2026-01-15T20:00:00.000Z" })])).toBe(
      "lecture-publique-2026"
    );
  });

  it("falls back to a generic slug when the title itself yields nothing usable", () => {
    expect(buildEventSlugBase("!!!", [])).toBe("evenement");
  });
});

describe("generateUniqueEventSlug", () => {
  it("returns the base slug when it is free", async () => {
    const repo = { findBySlug: jest.fn(async () => null) };

    const slug = await generateUniqueEventSlug(repo, "Concert", [
      occurrence({ city: "Descartes", eventStartAt: "2026-01-15T20:00:00.000Z" })
    ]);

    expect(slug).toBe("concert-descartes-2026");
  });

  it("appends the lowest free numeric suffix on a single collision", async () => {
    const repo = {
      findBySlug: jest
        .fn()
        .mockResolvedValueOnce({ id: "existing" })
        .mockResolvedValueOnce(null)
    };

    const slug = await generateUniqueEventSlug(repo, "Concert", [
      occurrence({ city: "Descartes", eventStartAt: "2026-01-15T20:00:00.000Z" })
    ]);

    expect(slug).toBe("concert-descartes-2026-2");
  });

  it("keeps incrementing the suffix across repeated collisions", async () => {
    const repo = {
      findBySlug: jest
        .fn()
        .mockResolvedValueOnce({ id: "existing-1" })
        .mockResolvedValueOnce({ id: "existing-2" })
        .mockResolvedValueOnce(null)
    };

    const slug = await generateUniqueEventSlug(repo, "Concert", [
      occurrence({ city: "Descartes", eventStartAt: "2026-01-15T20:00:00.000Z" })
    ]);

    expect(slug).toBe("concert-descartes-2026-3");
  });
});
