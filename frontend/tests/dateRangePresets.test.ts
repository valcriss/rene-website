import { formatDateInput, getWeekendRange, pad } from "../src/utils/dateRangePresets";

describe("pad", () => {
  it("pads single digits with a leading zero", () => {
    expect(pad(5)).toBe("05");
    expect(pad(12)).toBe("12");
  });
});

describe("formatDateInput", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatDateInput(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("getWeekendRange", () => {
  it("returns the upcoming Saturday/Sunday when today is a weekday", () => {
    // Wednesday 2026-01-14
    const range = getWeekendRange(new Date(2026, 0, 14));
    expect(range).toEqual({ start: "2026-01-17", end: "2026-01-18" });
  });

  it("returns this Saturday/Sunday when today is already Saturday", () => {
    // Saturday 2026-01-17
    const range = getWeekendRange(new Date(2026, 0, 17));
    expect(range).toEqual({ start: "2026-01-17", end: "2026-01-18" });
  });

  it("returns this weekend when today is Sunday, rolling into next Saturday", () => {
    // Sunday 2026-01-18
    const range = getWeekendRange(new Date(2026, 0, 18));
    expect(range).toEqual({ start: "2026-01-24", end: "2026-01-25" });
  });
});
