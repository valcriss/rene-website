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

  const buildRevision = (overrides: Record<string, unknown> = {}) => ({
    id: "rev-1",
    eventId: "1",
    title: "Concert revise",
    content: "Soirée",
    image: "revision.png",
    createdByUserId: null,
    categoryId: "music",
    audienceId: "all",
    eventStartAt: new Date("2026-01-15T20:00:00.000Z"),
    eventEndAt: new Date("2026-01-15T22:00:00.000Z"),
    allDay: false,
    venueName: "Salle",
    address: null,
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    organizerName: "Association",
    organizerUrl: null,
    contactEmail: null,
    contactPhone: null,
    ticketUrl: null,
    pricingInfo: null,
    websiteUrl: null,
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
    eventStartAt: new Date("2026-01-15T20:00:00.000Z"),
    eventEndAt: new Date("2026-01-15T22:00:00.000Z"),
    allDay: false,
    venueName: "Salle",
    address: null,
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    organizerName: "Association",
    organizerUrl: null,
    contactEmail: null,
    contactPhone: null,
    ticketUrl: null,
    pricingInfo: null,
    websiteUrl: null,
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
    const item = {
      id: "1",
      title: "Concert",
      content: "Soirée",
      image: "img",
      createdByUserId: null,
      categoryId: "music",
      audienceId: "all",
      eventStartAt: new Date("2026-01-15T20:00:00.000Z"),
      eventEndAt: new Date("2026-01-15T22:00:00.000Z"),
      allDay: false,
      venueName: "Salle",
      address: null,
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association",
      organizerUrl: null,
      contactEmail: null,
      contactPhone: null,
      ticketUrl: null,
      websiteUrl: null,
      status: "DRAFT" as const,
      publishedAt: null,
      publicationEndAt: new Date("2026-01-15T22:00:00.000Z"),
      rejectionReason: null,
      pendingRevision: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z")
    };
    prismaMocks.findMany.mockResolvedValue([item]);

    const result = await repo.list();

    expect(result[0].eventStartAt).toBe("2026-01-15T20:00:00.000Z");
    expect(prismaMocks.findMany).toHaveBeenCalledWith({ include: { pendingRevision: true }, orderBy: { eventStartAt: "asc" } });
  });

  it("maps single event", async () => {
    const repo = createPrismaEventRepository();
    const item = {
      id: "2",
      title: "Expo",
      content: "Art",
      image: "img",
      createdByUserId: null,
      categoryId: "art",
      audienceId: "all",
      eventStartAt: new Date("2026-02-01T10:00:00.000Z"),
      eventEndAt: new Date("2026-02-01T12:00:00.000Z"),
      allDay: false,
      venueName: "Galerie",
      address: "Rue",
      postalCode: "37000",
      city: "Tours",
      latitude: 47,
      longitude: 0.69,
      organizerName: "Musee",
      organizerUrl: null,
      contactEmail: null,
      contactPhone: null,
      ticketUrl: null,
      websiteUrl: null,
      status: "DRAFT" as const,
      publishedAt: new Date("2026-02-01T09:00:00.000Z"),
      publicationEndAt: new Date("2026-02-01T12:00:00.000Z"),
      rejectionReason: null,
      pendingRevision: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z")
    };
    prismaMocks.findUnique.mockResolvedValue(item);

    const result = await repo.getById("2");

    expect(result?.id).toBe("2");
    expect(result?.address).toBe("Rue");
    expect(result?.publishedAt).toBe("2026-02-01T09:00:00.000Z");
  });

  it("creates event", async () => {
    const repo = createPrismaEventRepository();
    const item = {
      id: "3",
      title: "Lecture",
      content: "Livre",
      image: "img",
      createdByUserId: null,
      categoryId: "book",
      audienceId: "all",
      eventStartAt: new Date("2026-03-01T10:00:00.000Z"),
      eventEndAt: new Date("2026-03-01T12:00:00.000Z"),
      allDay: true,
      venueName: "Bibliothèque",
      address: null,
      postalCode: "37000",
      city: "Tours",
      latitude: 47,
      longitude: 0.69,
      organizerName: "Mairie",
      organizerUrl: null,
      contactEmail: null,
      contactPhone: null,
      ticketUrl: null,
      websiteUrl: null,
      status: "DRAFT" as const,
      publishedAt: null,
      publicationEndAt: new Date("2026-03-01T12:00:00.000Z"),
      rejectionReason: null,
      pendingRevision: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z")
    };
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
      eventStartAt: "2026-03-01T10:00:00.000Z",
      eventEndAt: "2026-03-01T12:00:00.000Z",
      allDay: true,
      venueName: "Bibliothèque",
      address: "1 rue du centre",
      postalCode: "37000",
      city: "Tours",
      latitude: 47,
      longitude: 0.69,
      organizerName: "Mairie"
    });

    expect(result.id).toBe("3");
    expect(prismaMocks.create).toHaveBeenCalled();
    expect(prismaMocks.create.mock.calls[0][0]).toMatchObject({
      data: { geolocationPrecision: "EXACT" }
    });
  });

  it("defaults geolocation precision to unresolved when coordinates are missing", async () => {
    const repo = createPrismaEventRepository();
    const item = buildEvent({
      id: "3b",
      latitude: null,
      longitude: null,
      geolocationPrecision: "UNRESOLVED"
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
      eventStartAt: "2026-03-01T10:00:00.000Z",
      eventEndAt: "2026-03-01T12:00:00.000Z",
      allDay: true,
      venueName: "Bibliothèque",
      address: "1 rue du centre",
      postalCode: "37000",
      city: "Tours",
      latitude: null,
      longitude: null,
      organizerName: "Mairie"
    });

    expect(prismaMocks.create.mock.calls.at(-1)?.[0]).toMatchObject({
      data: { geolocationPrecision: "UNRESOLVED" }
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
        eventStartAt: "2026-03-01T10:00:00.000Z",
        eventEndAt: "2026-03-01T12:00:00.000Z",
        allDay: true,
        venueName: "Bibliothèque",
        address: "1 rue du centre",
        postalCode: "37000",
        city: "Tours",
        latitude: 47,
        longitude: 0.69,
        organizerName: "Mairie"
      })
    ).rejects.toThrow("Category not found");
  });

  it("updates event", async () => {
    const repo = createPrismaEventRepository();
    const item = {
      id: "4",
      title: "Expo",
      content: "Art",
      image: "img",
      createdByUserId: null,
      categoryId: "art",
      audienceId: "all",
      eventStartAt: new Date("2026-02-01T10:00:00.000Z"),
      eventEndAt: new Date("2026-02-01T12:00:00.000Z"),
      allDay: false,
      venueName: "Galerie",
      address: null,
      postalCode: "37000",
      city: "Tours",
      latitude: 47,
      longitude: 0.69,
      organizerName: "Musee",
      organizerUrl: null,
      contactEmail: null,
      contactPhone: null,
      ticketUrl: null,
      websiteUrl: null,
      status: "DRAFT" as const,
      publishedAt: null,
      publicationEndAt: new Date("2026-02-01T12:00:00.000Z"),
      rejectionReason: null,
      pendingRevision: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z")
    };
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
      eventStartAt: "2026-02-01T10:00:00.000Z",
      eventEndAt: "2026-02-01T12:00:00.000Z",
      allDay: false,
      venueName: "Galerie",
      address: "1 rue du centre",
      postalCode: "37000",
      city: "Tours",
      latitude: 47,
      longitude: 0.69,
      organizerName: "Musee"
    });

    expect(result?.id).toBe("4");
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
      eventStartAt: "2026-02-01T10:00:00.000Z",
      eventEndAt: "2026-02-01T12:00:00.000Z",
      allDay: false,
      venueName: "Galerie",
      address: "1 rue du centre",
      postalCode: "37000",
      city: "Tours",
      latitude: 47,
      longitude: 0.69,
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
    const item = {
      id: "5",
      title: "Expo",
      content: "Art",
      image: "img",
      categoryId: "art",
      audienceId: "all",
      eventStartAt: new Date("2026-02-01T10:00:00.000Z"),
      eventEndAt: new Date("2026-02-01T12:00:00.000Z"),
      allDay: false,
      venueName: "Galerie",
      address: null,
      postalCode: "37000",
      city: "Tours",
      latitude: 47,
      longitude: 0.69,
      organizerName: "Musee",
      organizerUrl: null,
      contactEmail: null,
      contactPhone: null,
      ticketUrl: null,
      websiteUrl: null,
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-01-01T10:00:00.000Z"),
      publicationEndAt: new Date("2026-02-01T12:00:00.000Z"),
      rejectionReason: null,
      pendingRevision: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z")
    };
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
        eventStartAt: "2026-03-01T10:00:00.000Z",
        eventEndAt: "2026-03-01T12:00:00.000Z",
        allDay: true,
        venueName: "Bibliothèque",
        address: "1 rue du centre",
        postalCode: "37000",
        city: "Tours",
        latitude: 47,
        longitude: 0.69,
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
        eventStartAt: "2026-02-01T10:00:00.000Z",
        eventEndAt: "2026-02-01T12:00:00.000Z",
        allDay: false,
        venueName: "Galerie",
        address: "1 rue du centre",
        postalCode: "37000",
        city: "Tours",
        latitude: 47,
        longitude: 0.69,
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
        eventStartAt: "2026-02-01T10:00:00.000Z",
        eventEndAt: "2026-02-01T12:00:00.000Z",
        allDay: false,
        venueName: "Galerie",
        address: "1 rue du centre",
        postalCode: "37000",
        city: "Tours",
        latitude: 47,
        longitude: 0.69,
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
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association"
    }, "DRAFT");

    expect(result?.pendingRevision?.status).toBe("DRAFT");
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
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
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
    expect(result?.pendingRevision).toBeNull();
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
