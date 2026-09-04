import { validateCreateEvent, validateEventCompleteness } from "../src/events/validation";

describe("validateCreateEvent", () => {
  const validOccurrence = {
    eventStartAt: "2026-01-15T00:00:00.000Z",
    eventEndAt: "2026-01-15T23:59:59.999Z",
    allDay: true,
    venueName: "Salle des fêtes",
    postalCode: "37160",
    city: "Descartes",
    address: "1 rue du centre"
  };

  const validPayload = {
    title: "Concert",
    content: "Soirée jazz",
    image: "https://example.com/image.jpg",
    categoryId: "music",
    audienceId: "all",
    organizerName: "Association",
    organizerUrl: "https://example.com",
    contactEmail: "contact@example.com",
    contactPhone: "0102030405",
    ticketUrl: "https://tickets.example.com",
    pricingInfo: "<p>Plein tarif : 12 €</p>",
    websiteUrl: "https://example.com/site",
    socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }],
    occurrences: [validOccurrence]
  };

  it("returns ok for valid payload", () => {
    const result = validateCreateEvent(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Concert");
      expect(result.value.occurrences).toHaveLength(1);
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
      expect(result.value.organizerName).toBeNull();
      expect(result.value.occurrences).toEqual([]);
    }
  });

  it("accepts citywide occurrences without venue and address", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, venueName: "", address: "" }]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].venueName).toBeNull();
      expect(result.value.occurrences[0].address).toBeNull();
    }
  });

  it("normalizes null venue and address to null", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, venueName: null, address: null }]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].venueName).toBeNull();
      expect(result.value.occurrences[0].address).toBeNull();
    }
  });

  it("accepts several occurrences, including the same venue at different dates", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [
        validOccurrence,
        { ...validOccurrence, eventStartAt: "2026-01-16T00:00:00.000Z", eventEndAt: "2026-01-16T23:59:59.999Z" },
        { ...validOccurrence, venueName: "Autre salle", city: "Tours" }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences).toHaveLength(3);
    }
  });

  it("returns errors for invalid start date", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, eventStartAt: "not-a-date" }]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Occurrence #1 : la date de début est invalide.");
    }
  });

  it("returns errors for invalid end date", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, eventEndAt: "not-a-date" }]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Occurrence #1 : la date de fin est invalide.");
    }
  });

  it("returns errors when end is before start", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [
        { ...validOccurrence, eventStartAt: "2026-01-15T00:00:00.000Z", eventEndAt: "2026-01-14T23:59:59.999Z" }
      ]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Occurrence #1 : la date de fin doit être après la date de début.");
    }
  });

  it("normalizes an omitted allDay field to null", () => {
    const { allDay, ...occurrenceWithoutAllDay } = validOccurrence;
    void allDay;
    const result = validateCreateEvent({ ...validPayload, occurrences: [occurrenceWithoutAllDay] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].allDay).toBeNull();
    }
  });

  it("accepts date-only occurrences", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, eventStartAt: "2026-01-15", eventEndAt: "2026-01-16" }]
    });

    expect(result.ok).toBe(true);
  });

  it("returns errors for out-of-range manual coordinates", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, latitude: 120, longitude: -200 }]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Occurrence #1 : la latitude saisie manuellement doit être comprise entre -90 et 90.",
          "Occurrence #1 : la longitude saisie manuellement doit être comprise entre -180 et 180."
        ])
      );
    }
  });

  it("returns errors for non-numeric manual coordinates", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, latitude: "nope", longitude: "nope" }]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Occurrence #1 : la latitude saisie manuellement doit être un nombre.",
          "Occurrence #1 : la longitude saisie manuellement doit être un nombre."
        ])
      );
    }
  });

  it("returns errors when top-level fields have the wrong type", () => {
    const result = validateCreateEvent({
      title: "Brouillon",
      content: 1,
      image: 2,
      categoryId: 3,
      audienceId: 4,
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
          "L'organisateur doit être une chaîne."
        ])
      );
    }
  });

  it("returns errors when occurrence fields have the wrong type", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [
        {
          eventStartAt: 5,
          eventEndAt: 6,
          postalCode: 7,
          city: 8,
          venueName: 9,
          address: 10
        }
      ]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Occurrence #1 : la date de début doit être une chaîne.",
          "Occurrence #1 : la date de fin doit être une chaîne.",
          "Occurrence #1 : le code postal doit être une chaîne.",
          "Occurrence #1 : la ville doit être une chaîne.",
          "Occurrence #1 : le lieu doit être une chaîne.",
          "Occurrence #1 : l'adresse doit être une chaîne."
        ])
      );
    }
  });

  it("rejects an occurrences payload that is not an array", () => {
    const result = validateCreateEvent({ ...validPayload, occurrences: "not-an-array" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Les occurrences doivent être une liste.");
    }
  });

  it("rejects a non-object occurrence", () => {
    const result = validateCreateEvent({ ...validPayload, occurrences: ["not-an-object"] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Occurrence #1 est invalide.");
    }
  });

  it("returns an error when occurrence allDay is provided but not a boolean", () => {
    const result = validateCreateEvent({
      ...validPayload,
      occurrences: [{ ...validOccurrence, allDay: "yes" }]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Occurrence #1 : le champ allDay doit être un booléen.");
    }
  });

  it("returns errors for optional top-level fields types", () => {
    const result = validateCreateEvent({
      ...validPayload,
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
    organizerName: "Association",
    occurrences: [
      {
        city: "Descartes",
        eventStartAt: "2026-01-15T00:00:00.000Z",
        eventEndAt: "2026-01-15T23:59:59.999Z",
        allDay: true
      }
    ]
  };

  it("returns no errors for a fully filled-in event", () => {
    expect(validateEventCompleteness(completeEvent)).toEqual([]);
  });

  it("requires a non-blank title", () => {
    expect(validateEventCompleteness({ ...completeEvent, title: "   " })).toContain("Le titre est requis.");
  });

  it("lists every missing top-level field and requires at least one occurrence", () => {
    const errors = validateEventCompleteness({
      title: "Brouillon",
      content: null,
      image: null,
      categoryId: null,
      audienceId: null,
      organizerName: null,
      occurrences: []
    });

    expect(errors).toEqual([
      "Le contenu est requis.",
      "L'image est requise.",
      "La catégorie est requise.",
      "Le public concerné est requis.",
      "L'organisateur est requis.",
      "Au moins une date et un lieu (ville) sont requis."
    ]);
  });

  it("requires at least one complete occurrence even when some are incomplete", () => {
    const errors = validateEventCompleteness({
      ...completeEvent,
      occurrences: [{ city: null, eventStartAt: null, eventEndAt: null, allDay: null }]
    });

    expect(errors).toEqual(["Au moins une date et un lieu (ville) sont requis."]);
  });

  it("accepts a submission where only one of several occurrences is complete", () => {
    const errors = validateEventCompleteness({
      ...completeEvent,
      occurrences: [
        { city: null, eventStartAt: null, eventEndAt: null, allDay: null },
        completeEvent.occurrences[0]
      ]
    });

    expect(errors).toEqual([]);
  });
});
