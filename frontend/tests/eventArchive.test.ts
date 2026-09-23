import { isEventArchived } from "../src/utils/eventArchive";

describe("isEventArchived", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("is archived when archivedAt is set", () => {
    expect(isEventArchived({ archivedAt: "2026-06-01T00:00:00.000Z", publicationEndAt: "2026-12-31T00:00:00.000Z" }, now)).toBe(true);
  });

  it("is archived when the publication end date is in the past", () => {
    expect(isEventArchived({ archivedAt: null, publicationEndAt: "2026-01-01T00:00:00.000Z" }, now)).toBe(true);
  });

  it("is not archived when the publication end date is in the future", () => {
    expect(isEventArchived({ archivedAt: null, publicationEndAt: "2026-12-31T00:00:00.000Z" }, now)).toBe(false);
  });

  it("is not archived when there is no publication end date", () => {
    expect(isEventArchived({ archivedAt: null, publicationEndAt: undefined }, now)).toBe(false);
  });
});
