"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repositoryFactory_1 = require("../src/admin/repositoryFactory");
const inMemoryMock = jest.fn(() => ({
    listUsers: jest.fn(async () => []),
    getUserById: jest.fn(async () => null),
    createUser: jest.fn(async () => ({
        id: "id",
        name: "",
        email: "",
        role: "ADMIN",
        createdAt: "",
        updatedAt: ""
    })),
    updateUser: jest.fn(async () => null),
    deleteUser: jest.fn(async () => false),
    listCategories: jest.fn(async () => []),
    getCategoryById: jest.fn(async () => null),
    createCategory: jest.fn(async () => ({ id: "cat", name: "Cat", createdAt: "", updatedAt: "" })),
    updateCategory: jest.fn(async () => null),
    deleteCategory: jest.fn(async () => false),
    getSettings: jest.fn(async () => ({ contactEmail: "", contactPhone: "", homepageIntro: "" })),
    updateSettings: jest.fn(async () => ({ contactEmail: "", contactPhone: "", homepageIntro: "" }))
}));
const prismaMock = jest.fn(() => inMemoryMock());
jest.mock("../src/admin/inMemoryRepository", () => ({
    createInMemoryAdminRepository: () => inMemoryMock()
}));
jest.mock("../src/admin/prismaRepository", () => ({
    createPrismaAdminRepository: () => prismaMock()
}));
describe("createAdminRepository", () => {
    const originalUrl = process.env.DATABASE_URL;
    const originalEnv = process.env.NODE_ENV;
    afterEach(() => {
        process.env.DATABASE_URL = originalUrl;
        process.env.NODE_ENV = originalEnv;
        inMemoryMock.mockClear();
        prismaMock.mockClear();
    });
    it("uses in-memory repository when DATABASE_URL is not set", () => {
        process.env.NODE_ENV = "development";
        process.env.DATABASE_URL = "";
        const repo = (0, repositoryFactory_1.createAdminRepository)();
        expect(repo).toBeDefined();
        expect(inMemoryMock).toHaveBeenCalled();
        expect(prismaMock).not.toHaveBeenCalled();
    });
    it("uses in-memory repository in test env", () => {
        process.env.NODE_ENV = "test";
        process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
        const repo = (0, repositoryFactory_1.createAdminRepository)();
        expect(repo).toBeDefined();
        expect(inMemoryMock).toHaveBeenCalled();
        expect(prismaMock).not.toHaveBeenCalled();
    });
    it("uses prisma repository when DATABASE_URL is set", () => {
        process.env.NODE_ENV = "development";
        process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
        const repo = (0, repositoryFactory_1.createAdminRepository)();
        expect(repo).toBeDefined();
        expect(prismaMock).toHaveBeenCalled();
    });
});
