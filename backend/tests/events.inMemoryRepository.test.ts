import { createInMemoryEventRepository } from "../src/events/inMemoryRepository";
import type { CreateEventInput } from "../src/events/types";

const baseOccurrence = {
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: "1 rue du centre",
  postalCode: "37160",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7
};

const payload: CreateEventInput = {
  title: "Concert",
  content: "Soirée",
  image: "img",
  categoryId: "music",
  audienceId: "all",
  occurrences: [baseOccurrence],
  organizerName: "Association",
  socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }],
  featured: false
};

describe("inMemoryEventRepository", () => {
  it("lists and gets created events", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create({ ...payload, createdByUserId: "user-1" });

    await expect(repo.list()).resolves.toEqual([created]);
    await expect(repo.getById(created.id)).resolves.toEqual(created);
    expect(created.socialLinks).toEqual([{ type: "FACEBOOK", url: "https://facebook.com/rene" }]);
    expect(created.occurrences).toHaveLength(1);
    expect(created.occurrences[0].city).toBe("Descartes");
  });

  it("updates and updates status", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create(payload);

    const updated = await repo.update(created.id, { ...payload, title: "Nouveau" });
    expect(updated?.title).toBe("Nouveau");

    const statusUpdated = await repo.updateStatus(created.id, "PUBLISHED", {
      publishedAt: "2026-01-01T00:00:00.000Z",
      rejectionReason: null,
      publicationEndAt: baseOccurrence.eventEndAt
    });
    expect(statusUpdated?.status).toBe("PUBLISHED");
  });

  it("falls back publicationEndAt to now when a title-only draft has no occurrences", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create({ ...payload, occurrences: [] });

    expect(typeof created.publicationEndAt).toBe("string");

    const updated = await repo.update(created.id, { ...payload, occurrences: [] });
    expect(typeof updated?.publicationEndAt).toBe("string");
    expect(Math.abs(new Date(updated!.publicationEndAt).getTime() - new Date(created.publicationEndAt).getTime())).toBeLessThan(1000);
  });

  it("updates featured flag on published event", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create(payload);

    const updated = await repo.updateFeatured(created.id, true);

    expect(updated?.featured).toBe(true);
  });

  it("returns null when updating featured flag on missing event", async () => {
    const repo = createInMemoryEventRepository();

    await expect(repo.updateFeatured("missing", true)).resolves.toBeNull();
  });

  it("returns null for missing ids", async () => {
    const repo = createInMemoryEventRepository();
    const updated = await repo.update("missing", payload);
    const deleted = await repo.delete("missing");
    const statusUpdated = await repo.updateStatus("missing", "REJECTED", {
      publishedAt: null,
      rejectionReason: "Motif",
      publicationEndAt: baseOccurrence.eventEndAt
    });

    expect(updated).toBeNull();
    expect(deleted).toBe(false);
    expect(statusUpdated).toBeNull();
  });

  it("deletes existing event", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create(payload);

    const deleted = await repo.delete(created.id);

    expect(deleted).toBe(true);
    expect(await repo.getById(created.id)).toBeNull();
  });

  it("manages pending revisions lifecycle", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create(payload);

    const drafted = await repo.upsertPendingRevision(created.id, { ...payload, title: "Révision" }, "DRAFT");
    expect(drafted?.pendingRevision?.status).toBe("DRAFT");

    const submitted = await repo.submitPendingRevision(created.id);
    expect(submitted?.pendingRevision?.status).toBe("PENDING");

    const rejected = await repo.rejectPendingRevision(created.id, "Motif");
    expect(rejected?.pendingRevision?.status).toBe("REJECTED");
    expect(rejected?.pendingRevision?.rejectionReason).toBe("Motif");

    await repo.upsertPendingRevision(created.id, { ...payload, title: "Révision finale" }, "DRAFT");
    await repo.submitPendingRevision(created.id);
    const published = await repo.publishPendingRevision(created.id, "2026-01-20T00:00:00.000Z");

    expect(published?.status).toBe("PUBLISHED");
    expect(published?.title).toBe("Révision finale");
    expect(published?.featured).toBe(false);
    expect(published?.socialLinks).toEqual([{ type: "FACEBOOK", url: "https://facebook.com/rene" }]);
    expect(published?.pendingRevision).toBeNull();
    expect(published?.occurrences).toHaveLength(1);
  });

  it("stores featured flag on pending revision and preserves it across updates", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create(payload);
    const { featured, ...revisionPayload } = payload;
    void featured;

    const firstDraft = await repo.upsertPendingRevision(
      created.id,
      { ...revisionPayload, title: "Révision mise en avant", featured: true },
      "DRAFT"
    );
    const secondDraft = await repo.upsertPendingRevision(
      created.id,
      { ...revisionPayload, title: "Révision conservée" },
      "DRAFT"
    );

    expect(firstDraft?.pendingRevision?.featured).toBe(true);
    expect(secondDraft?.pendingRevision?.featured).toBe(true);
  });

  it("defaults pending revision featured flag to false when omitted", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create(payload);
    const { featured, ...revisionPayload } = payload;
    void featured;

    const drafted = await repo.upsertPendingRevision(created.id, revisionPayload, "DRAFT");

    expect(drafted?.pendingRevision?.featured).toBe(false);
  });

  it("preserves original creator when publishing a pending revision", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create({ ...payload, createdByUserId: "owner-1" });

    await repo.upsertPendingRevision(
      created.id,
      { ...payload, createdByUserId: "editor-2", title: "Révision externe" },
      "PENDING"
    );

    const published = await repo.publishPendingRevision(created.id, "2026-01-20T00:00:00.000Z");

    expect(published?.createdByUserId).toBe("owner-1");
  });

  it("returns null for missing or invalid pending revision transitions", async () => {
    const repo = createInMemoryEventRepository();
    const created = await repo.create(payload);

    await expect(repo.upsertPendingRevision("missing", payload, "DRAFT")).resolves.toBeNull();
    await expect(repo.submitPendingRevision(created.id)).resolves.toBeNull();
    await expect(repo.rejectPendingRevision(created.id, "Motif")).resolves.toBeNull();
    await expect(repo.publishPendingRevision(created.id, "2026-01-20T00:00:00.000Z")).resolves.toBeNull();

    await repo.upsertPendingRevision(created.id, payload, "PENDING");
    await expect(repo.submitPendingRevision(created.id)).resolves.toBeNull();
  });
});
