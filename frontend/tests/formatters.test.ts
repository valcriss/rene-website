import { vi } from "vitest";
import { formatDateRange, formatPhoneNumber } from "../src/utils/formatters";

describe("formatPhoneNumber", () => {
  it("returns the not-provided label when empty", () => {
    expect(formatPhoneNumber(undefined)).toBe("Non renseigné");
    expect(formatPhoneNumber(null)).toBe("Non renseigné");
    expect(formatPhoneNumber("   ")).toBe("Non renseigné");
  });

  it("groups a 10-digit French number by pairs", () => {
    expect(formatPhoneNumber("0123456789")).toBe("01 23 45 67 89");
  });

  it("normalizes separators before grouping a French number", () => {
    expect(formatPhoneNumber("01.23.45.67.89")).toBe("01 23 45 67 89");
    expect(formatPhoneNumber("01 23 45 67 89")).toBe("01 23 45 67 89");
    expect(formatPhoneNumber("01-23-45-67-89")).toBe("01 23 45 67 89");
  });

  it("formats an international +33 number", () => {
    expect(formatPhoneNumber("+33612345678")).toBe("+33 6 12 34 56 78");
  });

  it("leaves unrecognized formats untouched", () => {
    expect(formatPhoneNumber("+1 555 123 4567")).toBe("+1 555 123 4567");
    expect(formatPhoneNumber("123")).toBe("123");
  });
});

describe("formatDateRange", () => {
  beforeEach(() => {
    // Event boundaries are stored as UTC (00:00:00.000Z / 23:59:59.999Z); a positive-offset local
    // timezone is what previously rolled the 23:59:59.999Z end boundary into the next local day.
    vi.stubEnv("TZ", "Europe/Paris");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not roll the end date forward in a positive-offset timezone", () => {
    expect(formatDateRange("2026-05-29T00:00:00.000Z", "2026-05-30T23:59:59.999Z")).toBe(
      "29/05/2026 → 30/05/2026"
    );
  });

  it("treats a single allDay event as one day, not two", () => {
    expect(formatDateRange("2026-05-29T00:00:00.000Z", "2026-05-29T23:59:59.999Z")).toBe("29/05/2026");
  });
});
