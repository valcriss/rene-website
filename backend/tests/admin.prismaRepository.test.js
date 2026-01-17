"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("@prisma/client", () => {
    const findMany = jest.fn();
    const findUnique = jest.fn();
    const create = jest.fn();
    const update = jest.fn();
    const remove = jest.fn();
    const count = jest.fn();
    return {
        PrismaClient: jest.fn(() => ({
            category: {
                findMany,
                findUnique,
                create,
                update,
                delete: remove
            },
            event: {
                count
            }
        })),
        __mocks: {
            findMany,
            findUnique,
            create,
            update,
            remove,
            count
        }
    };
});
const prismaRepository_1 = require("../src/admin/prismaRepository");
const prismaMocks = jest.requireMock("@prisma/client").__mocks;
describe("createPrismaAdminRepository", () => {
    beforeEach(() => {
        prismaMocks.findMany.mockReset();
        prismaMocks.findUnique.mockReset();
        prismaMocks.create.mockReset();
        prismaMocks.update.mockReset();
        prismaMocks.remove.mockReset();
        prismaMocks.count.mockReset();
    });
    it("manages users in memory", async () => {
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const users = await repo.listUsers();
        expect(users.length).toBe(1);
        const created = await repo.createUser({ name: "Alice", email: "alice@test", role: "EDITOR" });
        const fetched = await repo.getUserById(created.id);
        expect(fetched?.email).toBe("alice@test");
        const updated = await repo.updateUser(created.id, { name: "Alice2", email: "a2@test", role: "ADMIN" });
        expect(updated?.name).toBe("Alice2");
        const deleted = await repo.deleteUser(created.id);
        expect(deleted).toBe(true);
    });
    it("returns null when updating missing user", async () => {
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const updated = await repo.updateUser("missing", { name: "x", email: "x@test", role: "ADMIN" });
        expect(updated).toBeNull();
    });
    it("returns null when user not found", async () => {
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const user = await repo.getUserById("missing");
        expect(user).toBeNull();
    });
    it("lists categories", async () => {
        prismaMocks.findMany.mockResolvedValue([
            { id: "music", name: "Musique", createdAt: new Date(), updatedAt: new Date() }
        ]);
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const categories = await repo.listCategories();
        expect(categories[0].id).toBe("music");
    });
    it("gets category by id", async () => {
        prismaMocks.findUnique.mockResolvedValue({
            id: "music",
            name: "Musique",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const category = await repo.getCategoryById("music");
        expect(category?.name).toBe("Musique");
    });
    it("returns null when category not found", async () => {
        prismaMocks.findUnique.mockResolvedValue(null);
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const category = await repo.getCategoryById("missing");
        expect(category).toBeNull();
    });
    it("creates category", async () => {
        prismaMocks.findUnique.mockResolvedValue(null);
        prismaMocks.create.mockResolvedValue({
            id: "lecture",
            name: "Lecture",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const created = await repo.createCategory({ name: "Lecture" });
        expect(created.id).toBe("lecture");
    });
    it("throws when category name is invalid", async () => {
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        await expect(repo.createCategory({ name: "" })).rejects.toThrow("Category name is invalid");
    });
    it("throws when category already exists", async () => {
        prismaMocks.findUnique.mockResolvedValue({
            id: "lecture",
            name: "Lecture",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        await expect(repo.createCategory({ name: "Lecture" })).rejects.toThrow("Category already exists");
    });
    it("updates category", async () => {
        prismaMocks.update.mockResolvedValue({
            id: "lecture",
            name: "Lecture",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const updated = await repo.updateCategory("lecture", { name: "Lecture" });
        expect(updated?.id).toBe("lecture");
    });
    it("returns null when update fails", async () => {
        prismaMocks.update.mockRejectedValue(new Error("not found"));
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const updated = await repo.updateCategory("missing", { name: "Lecture" });
        expect(updated).toBeNull();
    });
    it("deletes category", async () => {
        prismaMocks.count.mockResolvedValue(0);
        prismaMocks.remove.mockResolvedValue({ id: "lecture" });
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const result = await repo.deleteCategory("lecture");
        expect(result).toBe(true);
    });
    it("returns false when delete fails", async () => {
        prismaMocks.count.mockResolvedValue(0);
        prismaMocks.remove.mockRejectedValue(new Error("not found"));
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const result = await repo.deleteCategory("missing");
        expect(result).toBe(false);
    });
    it("throws when category in use", async () => {
        prismaMocks.count.mockResolvedValue(2);
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        await expect(repo.deleteCategory("lecture")).rejects.toThrow("Category in use");
    });
    it("handles settings", async () => {
        const repo = (0, prismaRepository_1.createPrismaAdminRepository)();
        const settings = await repo.getSettings();
        const updated = await repo.updateSettings({
            contactEmail: "a@test",
            contactPhone: "0101",
            homepageIntro: "Intro"
        });
        expect(settings.contactEmail).toBeDefined();
        expect(updated.homepageIntro).toBe("Intro");
    });
});
