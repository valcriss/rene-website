import { validateCreateEvent, validateEventCompleteness } from "../src/events/validation";

describe("validateCreateEvent", () => {
  const validPayload = {
    title: "Concert",
    content: "Soirée jazz",
    image: "https://example.com/image.jpg",
    categoryId: "music",
    audienceId: "all",
    eventStartAt: "2026-01-15T00:00:00.000Z",
    eventEndAt: "2026-01-15T23:59:59.999Z",
    allDay: true,
    venueName: "Salle des fêtes",
    postalCode: "37160",
    city: "Descartes",
    organizerName: "Association",
    address: "1 rue du centre",
    organizerUrl: "https://example.com",
    contactEmail: "contact@example.com",
    contactPhone: "0102030405",
    ticketUrl: "https://tickets.example.com",
    pricingInfo: "<p>Plein tarif : 12 €</p>",
    websiteUrl: "https://example.com/site",
    socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }]
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

  it("returns an error only for a missing title", () => {
    const result = validateCreateEvent({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(["Le titre est requis."]);
    }
  });

  it("accepts a draft payload with only a title", () => {
    const result = validateCreateEvent({ title: "Brouillon sans détails" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Brouillon sans détails");
      expect(result.value.content).toBeNull();
      expect(result.value.image).toBeNull();
      expect(result.value.categoryId).toBeNull();
      expect(result.value.audienceId).toBeNull();
      expect(result.value.eventStartAt).toBeNull();
      expect(result.value.eventEndAt).toBeNull();
      expect(result.value.allDay).toBeNull();
      expect(result.value.venueName).toBeNull();
      expect(result.value.address).toBeNull();
      expect(result.value.postalCode).toBeNull();
      expect(result.value.city).toBeNull();
      expect(result.value.organizerName).toBeNull();
    }
  });

  it("accepts citywide payloads without venue and address", () => {
    const result = validateCreateEvent({
      ...validPayload,
      venueName: "",
      address: ""
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.venueName).toBeNull();
      expect(result.value.address).toBeNull();
    }
  });

  it("normalizes null venue and address to null", () => {
    const result = validateCreateEvent({
      ...validPayload,
      venueName: null,
      address: null
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.venueName).toBeNull();
      expect(result.value.address).toBeNull();
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
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-14T23:59:59.999Z"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La date de fin doit être après la date de début.");
    }
  });

  it("accepts date-only payloads", () => {
    const result = validateCreateEvent({
      ...validPayload,
      eventStartAt: "2026-01-15",
      eventEndAt: "2026-01-16"
    });

    expect(result.ok).toBe(true);
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
          "La latitude saisie manuellement doit être comprise entre -90 et 90.",
          "La longitude saisie manuellement doit être comprise entre -180 et 180."
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
        expect.arrayContaining([
          "La latitude saisie manuellement doit être un nombre.",
          "La longitude saisie manuellement doit être un nombre."
        ])
      );
    }
  });

  it("returns errors when now-optional fields have the wrong type", () => {
    const result = validateCreateEvent({
      title: "Brouillon",
      content: 1,
      image: 2,
      categoryId: 3,
      audienceId: 4,
      eventStartAt: 5,
      eventEndAt: 6,
      postalCode: 7,
      city: 8,
      organizerName: 9
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Le contenu doit être une chaîne.",
          "L'image doit être une chaîne.",
          "La catégorie doit être une chaîne.",
          "Le public concerné doit être une chaîne.",
          "La date de début doit être une chaîne.",
          "La date de fin doit être une chaîne.",
          "Le code postal doit être une chaîne.",
          "La ville doit être une chaîne.",
          "L'organisateur doit être une chaîne."
        ])
      );
    }
  });

  it("returns an error when allDay is provided but not a boolean", () => {
    const result = validateCreateEvent({
      ...validPayload,
      allDay: "yes"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le champ allDay doit être un booléen.");
    }
  });

  it("returns errors for optional fields types", () => {
    const result = validateCreateEvent({
      ...validPayload,
      venueName: 12,
      address: 123,
      organizerUrl: 456,
      contactEmail: 789,
      contactPhone: 101,
      ticketUrl: 202,
      pricingInfo: 404,
      websiteUrl: 303
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Le lieu doit être une chaîne.",
          "L'adresse doit être une chaîne.",
          "Le site de l'organisateur doit être une chaîne.",
          "L'email de contact doit être une chaîne.",
          "Le téléphone de contact doit être une chaîne.",
          "Le lien de billetterie doit être une chaîne.",
          "Les informations tarifaires doivent être une chaîne.",
          "Le site web doit être une chaîne."
        ])
      );
    }
  });

  it("sanitizes pricing info while preserving lightweight formatting", () => {
    const result = validateCreateEvent({
      ...validPayload,
      pricingInfo: "<ul><li><strong>Plein tarif</strong> : 12 €</li></ul><img src='x' /><script>alert(1)</script>"
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pricingInfo).toContain("<ul>");
      expect(result.value.pricingInfo).toContain("<strong>Plein tarif</strong>");
      expect(result.value.pricingInfo).not.toContain("<img");
      expect(result.value.pricingInfo).not.toContain("<script>");
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

  it("normalizes content that sanitizes to empty to null instead of erroring", () => {
    const result = validateCreateEvent({
      ...validPayload,
      content: "<script>alert(1)</script>"
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toBeNull();
    }
  });

  it("accepts valid social links", () => {
    const result = validateCreateEvent({
      ...validPayload,
      socialLinks: [
        { type: "FACEBOOK", url: "https://facebook.com/rene" },
        { type: "INSTAGRAM", url: "https://instagram.com/rene" }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.socialLinks).toEqual([
        { type: "FACEBOOK", url: "https://facebook.com/rene" },
        { type: "INSTAGRAM", url: "https://instagram.com/rene" }
      ]);
    }
  });

  it("rejects invalid social links payload", () => {
    const result = validateCreateEvent({
      ...validPayload,
      socialLinks: [{ type: "MYSPACE", url: "notaurl" }]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Le type du réseau social #1 est invalide.",
          "L'URL du réseau social #1 est invalide."
        ])
      );
    }
  });

  it("rejects duplicate social link types", () => {
    const result = validateCreateEvent({
      ...validPayload,
      socialLinks: [
        { type: "FACEBOOK", url: "https://facebook.com/rene" },
        { type: "FACEBOOK", url: "https://facebook.com/autre" }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le réseau social FACEBOOK est présent plusieurs fois.");
    }
  });

  it("rejects social links when payload is not an array", () => {
    const result = validateCreateEvent({
      ...validPayload,
      socialLinks: "https://facebook.com/rene"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Les réseaux sociaux doivent être une liste.");
    }
  });

  it("rejects social links with non-string urls", () => {
    const result = validateCreateEvent({
      ...validPayload,
      socialLinks: [{ type: "FACEBOOK", url: 12 }]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("L'URL du réseau social #1 est invalide.");
    }
  });

  it("rejects invalid social link objects and blank urls", () => {
    const result = validateCreateEvent({
      ...validPayload,
      socialLinks: [null, { type: "FACEBOOK", url: "   " }]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Le réseau social #1 est invalide.",
          "L'URL du réseau social #2 est requise."
        ])
      );
    }
  });

  it("rejects social link urls with unsupported protocols", () => {
    const result = validateCreateEvent({
      ...validPayload,
      socialLinks: [{ type: "FACEBOOK", url: "ftp://facebook.com/rene" }]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("L'URL du réseau social #1 doit commencer par http:// ou https://.");
    }
  });
});

describe("validateEventCompleteness", () => {
  const completeEvent = {
    title: "Concert",
    content: "Soirée jazz",
    image: "https://example.com/image.jpg",
    categoryId: "music",
    audienceId: "all",
    eventStartAt: "2026-01-15T00:00:00.000Z",
    eventEndAt: "2026-01-15T23:59:59.999Z",
    allDay: true,
    postalCode: "37160",
    city: "Descartes",
    organizerName: "Association"
  };

  it("returns no errors for a fully filled-in event", () => {
    expect(validateEventCompleteness(completeEvent)).toEqual([]);
  });

  it("requires a non-blank title", () => {
    expect(validateEventCompleteness({ ...completeEvent, title: "   " })).toContain("Le titre est requis.");
  });

  it("lists every missing field required for submission", () => {
    const errors = validateEventCompleteness({
      title: "Brouillon",
      content: null,
      image: null,
      categoryId: null,
      audienceId: null,
      eventStartAt: null,
      eventEndAt: null,
      allDay: null,
      postalCode: null,
      city: null,
      organizerName: null
    });

    expect(errors).toEqual([
      "Le contenu est requis.",
      "L'image est requise.",
      "La catégorie est requise.",
      "Le public concerné est requis.",
      "La date de début est requise.",
      "La date de fin est requise.",
      "Le champ allDay doit être un booléen.",
      "La ville est requise.",
      "L'organisateur est requis."
    ]);
  });

  it("accepts a submission with only a city and no postal code", () => {
    expect(validateEventCompleteness({ ...completeEvent, postalCode: null })).toEqual([]);
  });
});
