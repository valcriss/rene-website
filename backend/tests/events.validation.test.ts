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
      expect(result.errors).toContain("Le corps de la requête doit être un objet.");
    }
  });

  it("returns errors for missing fields", () => {
    const result = validateCreateEvent({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining(["Le titre est requis.", "Le contenu est requis.", "L'adresse est requise."])
      );
    }
  });

  it("accepts payload without coordinates", () => {
    const result = validateCreateEvent(validPayload);
    expect(result.ok).toBe(true);
  });

  it("returns errors for invalid start date", () => {
    const result = validateCreateEvent({
      ...validPayload,
      eventStartAt: "not-a-date"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La date de début est invalide.");
    }
  });

  it("returns errors for invalid end date", () => {
    const result = validateCreateEvent({
      ...validPayload,
      eventEndAt: "not-a-date"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La date de fin est invalide.");
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
      expect(result.errors).toContain("La date de fin doit être après la date de début.");
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
          "La latitude doit être comprise entre -90 et 90.",
          "La longitude doit être comprise entre -180 et 180."
        ])
      );
    }
  });

  it("returns errors for non-numeric coordinates", () => {
    const result = validateCreateEvent({
      ...validPayload,
      latitude: "nope",
      longitude: "nope"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining(["La latitude doit être un nombre.", "La longitude doit être un nombre."])
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
          "L'adresse doit être une chaîne.",
          "Le site de l'organisateur doit être une chaîne.",
          "L'email de contact doit être une chaîne.",
          "Le téléphone de contact doit être une chaîne.",
          "Le lien de billetterie doit être une chaîne.",
          "Le site web doit être une chaîne."
        ])
      );
    }
  });

  it("sanitizes content", () => {
    const result = validateCreateEvent({
      ...validPayload,
      content: "<h1>Title</h1><p><strong>Ok</strong> <script>alert(1)</script></p>"
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toContain("<strong>Ok</strong>");
      expect(result.value.content).not.toContain("<h1>");
      expect(result.value.content).not.toContain("<script>");
    }
  });

  it("rejects content when sanitized is empty", () => {
    const result = validateCreateEvent({
      ...validPayload,
      content: "<script>alert(1)</script>"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le contenu est requis.");
    }
  });
});
