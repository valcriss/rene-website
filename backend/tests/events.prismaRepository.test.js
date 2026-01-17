"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("@prisma/client", () => {
    const findMany = jest.fn();
    const findUnique = jest.fn();
    const create = jest.fn();
    const update = jest.fn();
    const remove = jest.fn();
    const findCategory = jest.fn();
    return {
        PrismaClient: jest.fn(() => ({
            event: {
                findMany,
                findUnique,
                create,
                update,
                delete: remove
            },
            category: {
                findUnique: findCategory
            }
        })),
        __mocks: {
            findMany,
            findUnique,
            create,
            update,
            remove,
            findCategory
        }
    };
});
const prismaRepository_1 = require("../src/events/prismaRepository");
const prismaMocks = jest.requireMock("@prisma/client").__mocks;
describe("createPrismaEventRepository", () => {
    beforeEach(() => {
        prismaMocks.findMany.mockReset();
        prismaMocks.findUnique.mockReset();
        prismaMocks.create.mockReset();
        prismaMocks.update.mockReset();
        prismaMocks.remove.mockReset();
        prismaMocks.findCategory.mockReset();
    });
    it("maps list events", async () => {
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        const item = {
            id: "1",
            title: "Concert",
            content: "Soirée",
            image: "img",
            createdByUserId: null,
            categoryId: "music",
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
            status: "DRAFT",
            publishedAt: null,
            publicationEndAt: new Date("2026-01-15T22:00:00.000Z"),
            rejectionReason: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z")
        };
        prismaMocks.findMany.mockResolvedValue([item]);
        const result = await repo.list();
        expect(result[0].eventStartAt).toBe("2026-01-15T20:00:00.000Z");
        expect(prismaMocks.findMany).toHaveBeenCalledWith({ orderBy: { eventStartAt: "asc" } });
    });
    it("maps single event", async () => {
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        const item = {
            id: "2",
            title: "Expo",
            content: "Art",
            image: "img",
            createdByUserId: null,
            categoryId: "art",
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
            status: "DRAFT",
            publishedAt: new Date("2026-02-01T09:00:00.000Z"),
            publicationEndAt: new Date("2026-02-01T12:00:00.000Z"),
            rejectionReason: null,
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
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        const item = {
            id: "3",
            title: "Lecture",
            content: "Livre",
            image: "img",
            createdByUserId: null,
            categoryId: "book",
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
            status: "DRAFT",
            publishedAt: null,
            publicationEndAt: new Date("2026-03-01T12:00:00.000Z"),
            rejectionReason: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z")
        };
        prismaMocks.create.mockResolvedValue(item);
        prismaMocks.findCategory.mockResolvedValue({ id: "book", name: "Lecture", createdAt: new Date(), updatedAt: new Date() });
        const result = await repo.create({
            title: "Lecture",
            content: "Livre",
            image: "img",
            createdByUserId: null,
            categoryId: "book",
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
    });
    it("throws when category is missing", async () => {
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        prismaMocks.findCategory.mockResolvedValue(null);
        await expect(repo.create({
            title: "Lecture",
            content: "Livre",
            image: "img",
            categoryId: "book",
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
        })).rejects.toThrow("Category not found");
    });
    it("updates event", async () => {
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        const item = {
            id: "4",
            title: "Expo",
            content: "Art",
            image: "img",
            createdByUserId: null,
            categoryId: "art",
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
            status: "DRAFT",
            publishedAt: null,
            publicationEndAt: new Date("2026-02-01T12:00:00.000Z"),
            rejectionReason: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z")
        };
        prismaMocks.update.mockResolvedValue(item);
        prismaMocks.findCategory.mockResolvedValue({ id: "art", name: "Art", createdAt: new Date(), updatedAt: new Date() });
        const result = await repo.update("4", {
            title: "Expo",
            content: "Art",
            image: "img",
            createdByUserId: null,
            categoryId: "art",
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
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        prismaMocks.update.mockRejectedValue(new Error("not found"));
        prismaMocks.findCategory.mockResolvedValue({ id: "art", name: "Art", createdAt: new Date(), updatedAt: new Date() });
        const result = await repo.update("missing", {
            title: "Expo",
            content: "Art",
            image: "img",
            categoryId: "art",
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
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        prismaMocks.remove.mockResolvedValue({ id: "1" });
        const result = await repo.delete("1");
        expect(result).toBe(true);
        expect(prismaMocks.remove).toHaveBeenCalled();
    });
    it("returns false when delete fails", async () => {
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        prismaMocks.remove.mockRejectedValue(new Error("not found"));
        const result = await repo.delete("missing");
        expect(result).toBe(false);
    });
    it("updates status", async () => {
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        const item = {
            id: "5",
            title: "Expo",
            content: "Art",
            image: "img",
            categoryId: "art",
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
            status: "PUBLISHED",
            publishedAt: new Date("2026-01-01T10:00:00.000Z"),
            publicationEndAt: new Date("2026-02-01T12:00:00.000Z"),
            rejectionReason: null,
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
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        prismaMocks.update.mockRejectedValue(new Error("not found"));
        const result = await repo.updateStatus("missing", "REJECTED", {
            publishedAt: null,
            rejectionReason: "Motif",
            publicationEndAt: "2026-02-01T12:00:00.000Z"
        });
        expect(result).toBeNull();
    });
    it("returns null for missing event", async () => {
        const repo = (0, prismaRepository_1.createPrismaEventRepository)();
        prismaMocks.findUnique.mockResolvedValue(null);
        const result = await repo.getById("missing");
        expect(result).toBeNull();
    });
});
