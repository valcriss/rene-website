import { validateCreateEvent } from "../src/events/validation";

describe("validateCreateEvent", () => {
  const validPayload = {
    title: "Concert",
    content: "Soirée jazz",
    image: "https://example.com/image.jpg",
    categoryId: "music",
    eventStartAt: "2026-01-15T20:00:00.000Z",
    eventEndAt: "2026-01-15T22:00:00.000Z",
    allDay: false,
    venueName: "Salle des fêtes",
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.70,
    organizerName: "Association",
    address: "1 rue du centre",
    organizerUrl: "https://example.com",
    contactEmail: "contact@example.com",
    contactPhone: "0102030405",
    ticketUrl: "https://tickets.example.com",
    websiteUrl: "https://example.com/site"
  };

  it("returns ok for valid payload", () => {
    const result = validateCreateEvent(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Concert");
    }
  });

  it("returns errors for non object", () => {
    const result = validateCreateEvent(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("body must be an object");
    }
  });

  it("returns errors for missing fields", () => {
    const result = validateCreateEvent({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining(["title is required", "content is required"]));
    }
  });

  it("returns errors for invalid start date", () => {
    const result = validateCreateEvent({
      ...validPayload,
      eventStartAt: "not-a-date"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("eventStartAt must be a valid date");
    }
  });

  it("returns errors for invalid end date", () => {
    const result = validateCreateEvent({
      ...validPayload,
      eventEndAt: "not-a-date"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("eventEndAt must be a valid date");
    }
  });

  it("returns errors when end is before start", () => {
    const result = validateCreateEvent({
      ...validPayload,
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-14T20:00:00.000Z"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("eventEndAt must be after eventStartAt");
    }
  });

  it("returns errors for coordinates", () => {
    const result = validateCreateEvent({
      ...validPayload,
      latitude: 120,
      longitude: -200
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "latitude must be between -90 and 90",
          "longitude must be between -180 and 180"
        ])
      );
    }
  });

  it("returns errors for optional fields types", () => {
    const result = validateCreateEvent({
      ...validPayload,
      address: 123,
      organizerUrl: 456,
      contactEmail: 789,
      contactPhone: 101,
      ticketUrl: 202,
      websiteUrl: 303
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "address must be string",
          "organizerUrl must be string",
          "contactEmail must be string",
          "contactPhone must be string",
          "ticketUrl must be string",
          "websiteUrl must be string"
        ])
      );
    }
  });
});
