import { describe, expect, it } from "vitest";
import {
  getEventAddressLabel,
  getEventCalendarLocation,
  getEventDirectionsQuery,
  getEventLocationLabel
} from "../src/utils/eventLocation";

describe("eventLocation", () => {
  it("formats venue and city when both are available", () => {
    expect(getEventLocationLabel({ venueName: "Salle des fêtes", city: "Descartes" })).toBe(
      "Salle des fêtes · Descartes"
    );
  });

  it("falls back to city or custom fallback when venue is missing", () => {
    expect(getEventLocationLabel({ venueName: "", city: "Descartes" }, "Fallback")).toBe("Descartes");
    expect(getEventLocationLabel({ venueName: "", city: "" }, "Fallback")).toBe("Fallback");
  });

  it("builds the best directions query from available fields", () => {
    expect(
      getEventDirectionsQuery({
        address: "1 rue du Centre",
        postalCode: "37160",
        city: "Descartes"
      })
    ).toBe("1 rue du Centre, 37160, Descartes");

    expect(
      getEventDirectionsQuery({
        venueName: "Salle des fêtes",
        postalCode: "37160",
        city: "Descartes"
      })
    ).toBe("Salle des fêtes, 37160, Descartes");

    expect(getEventDirectionsQuery({ postalCode: "37160", city: "Descartes" })).toBe("37160, Descartes");
    expect(getEventDirectionsQuery({ city: "Descartes" })).toBe("Descartes");
  });

  it("reuses location label for address and calendar fallbacks", () => {
    const citywideEvent = { venueName: "", address: "", postalCode: "37160", city: "Descartes" };

    expect(getEventAddressLabel(citywideEvent, "Fallback")).toBe("Descartes");
    expect(getEventCalendarLocation(citywideEvent, "Fallback")).toBe("37160, Descartes");
    expect(getEventCalendarLocation({ venueName: "", address: "", postalCode: "", city: "" }, "Fallback")).toBe(
      "Fallback"
    );
  });
});