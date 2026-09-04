jest.mock("@prisma/client", () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const findCategory = jest.fn();
  const findAudience = jest.fn();
  const transaction = jest.fn();

  const client = {
    event: {
      findMany,
      findUnique,
      create,
      update,
      delete: remove
    },
    category: {
      findUnique: findCategory
    },
    audience: {
      findUnique: findAudience
    },
    $transaction: transaction
  };

  transaction.mockImplementation(async (handler: (value: typeof client) => Promise<unknown>) => handler(client));

  return {
    PrismaClient: jest.fn(() => client),
    __mocks: {
      findMany,
      findUnique,
      create,
      update,
      remove,
      findCategory,
      findAudience,
      transaction
    }
  };
});

import { createPrismaEventRepository } from "../src/events/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  findCategory: jest.Mock;
  findAudience: jest.Mock;
  transaction: jest.Mock;
};

const includeOccurrencesAndRevision = {
  occurrences: true,
  pendingRevision: { include: { occurrences: true } }
};

describe("createPrismaEventRepository", () => {
  beforeEach(() => {
    prismaMocks.findMany.mockReset();
    prismaMocks.findUnique.mockReset();
    prismaMocks.create.mockReset();
    prismaMocks.update.mockReset();
    prismaMocks.remove.mockReset();
    prismaMocks.findCategory.mockReset();
    prismaMocks.findAudience.mockReset();
    prismaMocks.transaction.mockClear();
  });

  const baseOccurrence = {
    id: "occ-1",
    venueName: "Salle",
    address: null,
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    geolocationPrecision: "EXACT" as const,
    eventStartAt: new Date("2026-01-15T20:00:00.000Z"),
    eventEndAt: new Date("2026-01-15T22:00:00.000Z"),
    allDay: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z")
  };

  const occurrenceInput = {
    venueName: "Salle",
    address: "1 rue du centre",
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    eventStartAt: "2026-01-15T20:00:00.000Z",
    eventEndAt: "2026-01-15T22:00:00.000Z",
    allDay: false
  };

  const buildRevision = (overrides: Record<string, unknown> = {}) => ({
    id: "rev-1",
    eventId: "1",
    title: "Concert revise",
    content: "Soirée",
    image: "revision.png",
    createdByUserId: null,
    categoryId: "music",
    audienceId: "all",
    occurrences: [baseOccurrence],
    organizerName: "Association",
    organizerUrl: null,
    contactEmail: null,
    contactPhone: null,
    ticketUrl: null,
    pricingInfo: null,
    websiteUrl: null,
    socialLinks: [],
    featured: false,
    status: "DRAFT",
    rejectionReason: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides
  });

  const buildEvent = (overrides: Record<string, unknown> = {}) => ({
    id: "1",
    title: "Concert",
    content: "Soirée",
    image: "img",
    createdByUserId: null,
    categoryId: "music",
    audienceId: "all",
    occurrences: [baseOccurrence],
    organizerName: "Association",
    organizerUrl: null,
    contactEmail: null,
    contactPhone: null,
    ticketUrl: null,
    pricingInfo: null,
    websiteUrl: null,
    socialLinks: [],
    featured: false,
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: new Date("2026-01-15T22:00:00.000Z"),
    rejectionReason: null,
    pendingRevision: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides
  });

  it("maps list events", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({
      socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }]
    });
    prismaMocks.findMany.mockResolvedValue([item]);

    const result = await repo.list();

    expect(result[0].occurrences[0].eventStartAt).toBe("2026-01-15T20:00:00.000Z");
    expect(result[0].socialLinks).toEqual([{ type: "FACEBOOK", url: "https://facebook.com/rene" }]);
    expect(prismaMocks.findMany).toHaveBeenCalledWith({ include: includeOccurrencesAndRevision, orderBy: { createdAt: "asc" } });
  });

  it("treats a non-array social links value as empty", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findMany.mockResolvedValue([buildEvent({ socialLinks: null })]);

    const result = await repo.list();

    expect(result[0]?.socialLinks).toEqual([]);
  });

  it("filters invalid social links when mapping prisma events", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findMany.mockResolvedValue([
      buildEvent({
        socialLinks: [null, { type: "FACEBOOK", url: 12 }, { type: "INSTAGRAM", url: "https://instagram.com/rene" }]
      })
    ]);

    const result = await repo.list();

    expect(result[0]?.socialLinks).toEqual([{ type: "INSTAGRAM", url: "https://instagram.com/rene" }]);
  });

  it("sorts events by earliest occurrence, undated drafts last", async () => {
    const repo = createPrismaEventRepository();
    const undated = buildEvent({ id: "undated", occurrences: [] });
    const later = buildEvent({
      id: "later",
      occurrences: [{ ...baseOccurrence, eventStartAt: new Date("2026-03-01T00:00:00.000Z"), eventEndAt: new Date("2026-03-01T01:00:00.000Z") }]
    });
    const earlier = buildEvent({
      id: "earlier",
      occurrences: [{ ...baseOccurrence, eventStartAt: new Date("2026-01-01T00:00:00.000Z"), eventEndAt: new Date("2026-01-01T01:00:00.000Z") }]
    });
    prismaMocks.findMany.mockResolvedValue([undated, later, earlier]);

    const result = await repo.list();

    expect(result.map((event) => event.id)).toEqual(["earlier", "later", "undated"]);
  });

  it("maps single event", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({
      id: "2",
      title: "Expo",
      content: "Art",
      categoryId: "art",
      organizerName: "Musee",
      publishedAt: new Date("2026-02-01T09:00:00.000Z"),
      occurrences: [{ ...baseOccurrence, address: "Rue", city: "Tours", postalCode: "37000", latitude: 47, longitude: 0.69 }]
    });
    prismaMocks.findUnique.mockResolvedValue(item);

    const result = await repo.getById("2");

    expect(result?.id).toBe("2");
    expect(result?.occurrences[0].address).toBe("Rue");
    expect(result?.publishedAt).toBe("2026-02-01T09:00:00.000Z");
  });

  it("creates event", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({ id: "3", title: "Lecture", content: "Livre", categoryId: "book", organizerName: "Mairie" });
    prismaMocks.create.mockResolvedValue(item);
    prismaMocks.findCategory.mockResolvedValue({ id: "book", name: "Lecture", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });

    const result = await repo.create({
      title: "Lecture",
      content: "Livre",
      image: "img",
      createdByUserId: null,
      categoryId: "book",
      audienceId: "all",
      occurrences: [occurrenceInput],
      organizerName: "Mairie",
      socialLinks: [{ type: "INSTAGRAM", url: "https://instagram.com/rene" }]
    });

    expect(result.id).toBe("3");
    expect(prismaMocks.create).toHaveBeenCalled();
    expect(prismaMocks.create.mock.calls[0][0]).toMatchObject({
      data: {
        socialLinks: [{ type: "INSTAGRAM", url: "https://instagram.com/rene" }],
        occurrences: { create: [expect.objectContaining({ geolocationPrecision: "EXACT" })] }
      }
    });
  });

  it("creates a title-only draft without checking category or audience", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({
      id: "3c",
      content: null,
      image: null,
      categoryId: null,
      audienceId: null,
      organizerName: null,
      occurrences: [],
      pendingRevision: null
    });
    prismaMocks.create.mockResolvedValue(item);

    const result = await repo.create({
      title: "Brouillon",
      content: null,
      image: null,
      createdByUserId: null,
      categoryId: null,
      audienceId: null,
      occurrences: [],
      organizerName: null
    });

    expect(result.id).toBe("3c");
    expect(prismaMocks.findCategory).not.toHaveBeenCalled();
    expect(prismaMocks.findAudience).not.toHaveBeenCalled();
    expect(prismaMocks.create.mock.calls[0][0]).toMatchObject({
      data: {
        occurrences: { create: [] }
      }
    });
  });

  it("defaults geolocation precision to unresolved when coordinates are missing", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({
      id: "3b",
      occurrences: [{ ...baseOccurrence, latitude: null, longitude: null, geolocationPrecision: "UNRESOLVED" }]
    });
    prismaMocks.create.mockResolvedValue(item);
    prismaMocks.findCategory.mockResolvedValue({ id: "book", name: "Lecture", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });

    await repo.create({
      title: "Lecture",
      content: "Livre",
      image: "img",
      createdByUserId: null,
      categoryId: "book",
      audienceId: "all",
      occurrences: [{ ...occurrenceInput, latitude: null, longitude: null }],
      organizerName: "Mairie"
    });

    expect(prismaMocks.create.mock.calls.at(-1)?.[0]).toMatchObject({
      data: { occurrences: { create: [expect.objectContaining({ geolocationPrecision: "UNRESOLVED" })] } }
    });
  });

  it("throws when category is missing", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findCategory.mockResolvedValue(null);
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });

    await expect(
      repo.create({
        title: "Lecture",
        content: "Livre",
        image: "img",
        categoryId: "book",
        audienceId: "all",
        occurrences: [occurrenceInput],
        organizerName: "Mairie"
      })
    ).rejects.toThrow("Category not found");
  });

  it("updates event", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({ id: "4", title: "Expo", content: "Art", categoryId: "art", organizerName: "Musee" });
    prismaMocks.update.mockResolvedValue(item);
    prismaMocks.findCategory.mockResolvedValue({ id: "art", name: "Art", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });

    const result = await repo.update("4", {
      title: "Expo",
      content: "Art",
      image: "img",
      createdByUserId: null,
      categoryId: "art",
      audienceId: "all",
      occurrences: [occurrenceInput],
      organizerName: "Musee"
    });

    expect(result?.id).toBe("4");
    expect(prismaMocks.update.mock.calls[0][0]).toMatchObject({
      data: { occurrences: { deleteMany: {}, create: [expect.objectContaining({ city: "Descartes" })] } }
    });
  });

  it("updates a title-only draft with no occurrences", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.update.mockResolvedValue(buildEvent({ id: "4b", occurrences: [] }));

    await repo.update("4b", {
      title: "Brouillon",
      content: null,
      image: null,
      createdByUserId: null,
      categoryId: null,
      audienceId: null,
      occurrences: [],
      organizerName: null
    });

    expect(prismaMocks.update.mock.calls[0][0]).toMatchObject({
      data: {
        occurrences: { deleteMany: {}, create: [] },
        publicationEndAt: expect.any(Date)
      }
    });
  });

  it("returns null when update fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.update.mockRejectedValue(new Error("not found"));
    prismaMocks.findCategory.mockResolvedValue({ id: "art", name: "Art", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });

    const result = await repo.update("missing", {
      title: "Expo",
      content: "Art",
      image: "img",
      categoryId: "art",
      audienceId: "all",
      occurrences: [occurrenceInput],
      organizerName: "Musee"
    });

    expect(result).toBeNull();
  });

  it("deletes event", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.remove.mockResolvedValue({ id: "1" });

    const result = await repo.delete("1");

    expect(result).toBe(true);
    expect(prismaMocks.remove).toHaveBeenCalled();
  });

  it("returns false when delete fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.remove.mockRejectedValue(new Error("not found"));

    const result = await repo.delete("missing");

    expect(result).toBe(false);
  });

  it("updates status", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({
      id: "5",
      title: "Expo",
      content: "Art",
      categoryId: "art",
      organizerName: "Musee",
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-01T10:00:00.000Z")
    });
    prismaMocks.update.mockResolvedValue(item);

    const result = await repo.updateStatus("5", "PUBLISHED", {
      publishedAt: "2026-01-01T10:00:00.000Z",
      rejectionReason: null,
      publicationEndAt: "2026-02-01T12:00:00.000Z"
    });

    expect(result?.status).toBe("PUBLISHED");
  });

  it("returns null when updateStatus fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.update.mockRejectedValue(new Error("not found"));

    const result = await repo.updateStatus("missing", "REJECTED", {
      publishedAt: null,
      rejectionReason: "Motif",
      publicationEndAt: "2026-02-01T12:00:00.000Z"
    });

    expect(result).toBeNull();
  });

  it("returns null for missing event", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique.mockResolvedValue(null);

    const result = await repo.getById("missing");

    expect(result).toBeNull();
  });

  it("throws when audience is missing", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findCategory.mockResolvedValue({ id: "book", name: "Lecture", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue(null);

    await expect(
      repo.create({
        title: "Lecture",
        content: "Livre",
        image: "img",
        categoryId: "book",
        audienceId: "all",
        occurrences: [occurrenceInput],
        organizerName: "Mairie"
      })
    ).rejects.toThrow("Audience not found");
  });

  it("returns null when update category is missing", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findCategory.mockResolvedValue(null);

    await expect(
      repo.update("missing", {
        title: "Expo",
        content: "Art",
        image: "img",
        categoryId: "art",
        audienceId: "all",
        occurrences: [occurrenceInput],
        organizerName: "Musee"
      })
    ).rejects.toThrow("Category not found");
  });

  it("returns null when update audience is missing", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findCategory.mockResolvedValue({ id: "art", name: "Art", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue(null);

    await expect(
      repo.update("missing", {
        title: "Expo",
        content: "Art",
        image: "img",
        categoryId: "art",
        audienceId: "all",
        occurrences: [occurrenceInput],
        organizerName: "Musee"
      })
    ).rejects.toThrow("Audience not found");
  });

  it("upserts a pending revision", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findCategory.mockResolvedValue({ id: "music", name: "Musique", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.update.mockResolvedValue(buildEvent({ pendingRevision: buildRevision() }));

    const result = await repo.upsertPendingRevision("1", {
      title: "Concert revise",
      content: "Soirée",
      image: "revision.png",
      createdByUserId: null,
      categoryId: "music",
      audienceId: "all",
      occurrences: [occurrenceInput],
      organizerName: "Association"
    }, "DRAFT");

    expect(result?.pendingRevision?.status).toBe("DRAFT");
  });

  it("maps a pending revision with unset dates", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findCategory.mockResolvedValue({ id: "music", name: "Musique", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.update.mockResolvedValue(
      buildEvent({ pendingRevision: buildRevision({ occurrences: [{ ...baseOccurrence, eventStartAt: null, eventEndAt: null, allDay: null }] }) })
    );

    const result = await repo.upsertPendingRevision("1", {
      title: "Concert revise",
      content: "Soirée",
      image: "revision.png",
      createdByUserId: null,
      categoryId: "music",
      audienceId: "all",
      occurrences: [{ ...occurrenceInput, eventStartAt: null, eventEndAt: null, allDay: null }],
      organizerName: "Association"
    }, "DRAFT");

    expect(result?.pendingRevision?.occurrences[0].eventStartAt).toBeNull();
    expect(result?.pendingRevision?.occurrences[0].eventEndAt).toBeNull();
  });

  it("returns null when upsert pending revision fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findCategory.mockResolvedValue({ id: "music", name: "Musique", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.findAudience.mockResolvedValue({ id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() });
    prismaMocks.update.mockRejectedValue(new Error("boom"));

    const result = await repo.upsertPendingRevision("1", {
      title: "Concert revise",
      content: "Soirée",
      image: "revision.png",
      createdByUserId: null,
      categoryId: "music",
      audienceId: "all",
      occurrences: [occurrenceInput],
      organizerName: "Association"
    }, "DRAFT");

    expect(result).toBeNull();
  });

  it("submits a pending revision", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique
      .mockResolvedValueOnce(buildEvent({ pendingRevision: buildRevision() }))
      .mockResolvedValueOnce(buildEvent({ pendingRevision: buildRevision({ status: "PENDING" }) }));
    prismaMocks.update.mockResolvedValue(buildEvent({ pendingRevision: buildRevision({ status: "PENDING" }) }));

    const result = await repo.submitPendingRevision("1");

    expect(result?.pendingRevision?.status).toBe("PENDING");
  });

  it("returns null when pending revision is missing during submit", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique.mockResolvedValue(buildEvent());

    const result = await repo.submitPendingRevision("1");

    expect(result).toBeNull();
  });

  it("returns null when submit pending revision fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique.mockResolvedValue(buildEvent({ pendingRevision: buildRevision() }));
    prismaMocks.update.mockRejectedValue(new Error("boom"));

    const result = await repo.submitPendingRevision("1");

    expect(result).toBeNull();
  });

  it("rejects a pending revision", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique
      .mockResolvedValueOnce(buildEvent({ pendingRevision: buildRevision({ status: "PENDING" }) }))
      .mockResolvedValueOnce(buildEvent({ pendingRevision: buildRevision({ status: "REJECTED", rejectionReason: "Motif" }) }));
    prismaMocks.update.mockResolvedValue(buildEvent({ pendingRevision: buildRevision({ status: "REJECTED", rejectionReason: "Motif" }) }));

    const result = await repo.rejectPendingRevision("1", "Motif");

    expect(result?.pendingRevision?.status).toBe("REJECTED");
    expect(result?.pendingRevision?.rejectionReason).toBe("Motif");
  });

  it("returns null when pending revision is missing during reject", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique.mockResolvedValue(buildEvent());

    const result = await repo.rejectPendingRevision("1", "Motif");

    expect(result).toBeNull();
  });

  it("returns null when reject pending revision fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique.mockResolvedValue(buildEvent({ pendingRevision: buildRevision({ status: "PENDING" }) }));
    prismaMocks.update.mockRejectedValue(new Error("boom"));

    const result = await repo.rejectPendingRevision("1", "Motif");

    expect(result).toBeNull();
  });

  it("publishes a pending revision", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique
      .mockResolvedValueOnce(buildEvent({ pendingRevision: buildRevision({ status: "PENDING" }) }))
      .mockResolvedValueOnce(buildEvent({
        title: "Concert revise",
        image: "revision.png",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-20T00:00:00.000Z"),
        pendingRevision: null
      }));
    prismaMocks.update.mockResolvedValue(buildEvent({
      title: "Concert revise",
      image: "revision.png",
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-20T00:00:00.000Z"),
      pendingRevision: null
    }));

    const result = await repo.publishPendingRevision("1", "2026-01-20T00:00:00.000Z");

    expect(prismaMocks.transaction).toHaveBeenCalled();
    expect(result?.status).toBe("PUBLISHED");
    expect(result?.featured).toBe(false);
    expect(result?.pendingRevision).toBeNull();
  });

  it("publishes a pending revision with an occurrence that has no dates", async () => {
    const repo = createPrismaEventRepository();
    const revisionWithUndatedOccurrence = buildRevision({
      status: "PENDING",
      occurrences: [{ ...baseOccurrence, eventStartAt: null, eventEndAt: null, allDay: null }]
    });
    prismaMocks.findUnique
      .mockResolvedValueOnce(buildEvent({ pendingRevision: revisionWithUndatedOccurrence }))
      .mockResolvedValueOnce(buildEvent({
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-20T00:00:00.000Z"),
        pendingRevision: null
      }));
    prismaMocks.update.mockResolvedValue(buildEvent({
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-20T00:00:00.000Z"),
      pendingRevision: null
    }));

    const result = await repo.publishPendingRevision("1", "2026-01-20T00:00:00.000Z");

    expect(result?.status).toBe("PUBLISHED");
  });

  it("updates featured flag", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.update.mockResolvedValue(buildEvent({ status: "PUBLISHED", featured: true }));

    const result = await repo.updateFeatured("1", true);

    expect(prismaMocks.update).toHaveBeenCalledWith({
      where: { id: "1" },
      include: includeOccurrencesAndRevision,
      data: { featured: true }
    });
    expect(result?.featured).toBe(true);
  });

  it("returns null when updating featured flag fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.update.mockRejectedValue(new Error("boom"));

    const result = await repo.updateFeatured("1", true);

    expect(result).toBeNull();
  });

  it("returns null when pending revision is missing during publish", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique.mockResolvedValue(buildEvent());

    const result = await repo.publishPendingRevision("1", "2026-01-20T00:00:00.000Z");

    expect(result).toBeNull();
  });

  it("returns null when pending revision is not submitted during publish", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.findUnique.mockResolvedValue(buildEvent({ pendingRevision: buildRevision({ status: "DRAFT" }) }));

    const result = await repo.publishPendingRevision("1", "2026-01-20T00:00:00.000Z");

    expect(result).toBeNull();
  });

  it("returns null when publish pending revision transaction fails", async () => {
    const repo = createPrismaEventRepository();
    prismaMocks.transaction.mockRejectedValueOnce(new Error("boom"));

    const result = await repo.publishPendingRevision("1", "2026-01-20T00:00:00.000Z");

    expect(result).toBeNull();
  });
});
