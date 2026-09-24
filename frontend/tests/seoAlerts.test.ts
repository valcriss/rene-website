import { computeSeoAlerts } from "../src/utils/seoAlerts";

const completeInput = {
  title: "Concert de jazz au kiosque",
  description: "Une soirée jazz exceptionnelle au cœur du parc municipal, avec plusieurs artistes locaux.",
  image: "https://example.com/image.jpg",
  occurrences: [
    { city: "Descartes", eventStartAt: "2026-01-15T20:00:00.000Z", eventEndAt: "2026-01-15T22:00:00.000Z" }
  ]
};

describe("computeSeoAlerts", () => {
  it("returns no alerts for a fully filled-in, coherent event", () => {
    expect(computeSeoAlerts(completeInput)).toEqual([]);
  });

  it("flags a title that is too short/generic", () => {
    expect(computeSeoAlerts({ ...completeInput, title: "Concert" })).toContain("genericTitle");
  });

  it("flags a description that is too short or empty", () => {
    expect(computeSeoAlerts({ ...completeInput, description: "" })).toContain("thinDescription");
    expect(computeSeoAlerts({ ...completeInput, description: "Trop court" })).toContain("thinDescription");
  });

  it("flags a missing image", () => {
    expect(computeSeoAlerts({ ...completeInput, image: null })).toContain("missingImage");
    expect(computeSeoAlerts({ ...completeInput, image: undefined })).toContain("missingImage");
  });

  it("flags an occurrence whose end date is before its start date", () => {
    const alerts = computeSeoAlerts({
      ...completeInput,
      occurrences: [
        { city: "Descartes", eventStartAt: "2026-01-15T20:00:00.000Z", eventEndAt: "2026-01-15T18:00:00.000Z" }
      ]
    });

    expect(alerts).toContain("incoherentDates");
  });

  it("does not flag dates when either boundary is missing", () => {
    const alerts = computeSeoAlerts({
      ...completeInput,
      occurrences: [{ city: "Descartes", eventStartAt: null, eventEndAt: null }]
    });

    expect(alerts).not.toContain("incoherentDates");
  });

  it("flags a missing city across every occurrence", () => {
    expect(computeSeoAlerts({ ...completeInput, occurrences: [] })).toContain("missingLocation");
    expect(
      computeSeoAlerts({
        ...completeInput,
        occurrences: [{ city: null, eventStartAt: null, eventEndAt: null }, { city: "   ", eventStartAt: null, eventEndAt: null }]
      })
    ).toContain("missingLocation");
  });

  it("does not flag location when at least one occurrence has a city", () => {
    const alerts = computeSeoAlerts({
      ...completeInput,
      occurrences: [
        { city: null, eventStartAt: null, eventEndAt: null },
        { city: "Descartes", eventStartAt: null, eventEndAt: null }
      ]
    });

    expect(alerts).not.toContain("missingLocation");
  });
});
