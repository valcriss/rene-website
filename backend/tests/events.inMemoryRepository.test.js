"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inMemoryRepository_1 = require("../src/events/inMemoryRepository");
const payload = {
    title: "Concert",
    content: "Soirée",
    image: "img",
    categoryId: "music",
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
};
describe("inMemoryEventRepository", () => {
    it("updates and updates status", async () => {
        const repo = (0, inMemoryRepository_1.createInMemoryEventRepository)();
        const created = await repo.create(payload);
        const updated = await repo.update(created.id, { ...payload, title: "Nouveau" });
        expect(updated?.title).toBe("Nouveau");
        const statusUpdated = await repo.updateStatus(created.id, "PUBLISHED", {
            publishedAt: "2026-01-01T00:00:00.000Z",
            rejectionReason: null,
            publicationEndAt: payload.eventEndAt
        });
        expect(statusUpdated?.status).toBe("PUBLISHED");
    });
    it("returns null for missing ids", async () => {
        const repo = (0, inMemoryRepository_1.createInMemoryEventRepository)();
        const updated = await repo.update("missing", payload);
        const deleted = await repo.delete("missing");
        const statusUpdated = await repo.updateStatus("missing", "REJECTED", {
            publishedAt: null,
            rejectionReason: "Motif",
            publicationEndAt: payload.eventEndAt
        });
        expect(updated).toBeNull();
        expect(deleted).toBe(false);
        expect(statusUpdated).toBeNull();
    });
    it("deletes existing event", async () => {
        const repo = (0, inMemoryRepository_1.createInMemoryEventRepository)();
        const created = await repo.create(payload);
        const deleted = await repo.delete(created.id);
        expect(deleted).toBe(true);
        expect(await repo.getById(created.id)).toBeNull();
    });
});
