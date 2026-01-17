"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("../src/auth/prismaRepository", () => ({
    createPrismaAuthRepository: jest.fn(() => ({
        getUserByEmail: async () => null,
        getUserById: async () => null,
        listUsersByRole: async () => []
    }))
}));
jest.mock("../src/auth/inMemoryRepository", () => ({
    createInMemoryAuthRepository: jest.fn(() => ({
        getUserByEmail: async () => null,
        getUserById: async () => null,
        listUsersByRole: async () => []
    }))
}));
const repositoryFactory_1 = require("../src/auth/repositoryFactory");
const prismaRepository_1 = require("../src/auth/prismaRepository");
const inMemoryRepository_1 = require("../src/auth/inMemoryRepository");
describe("auth repositoryFactory", () => {
    const originalEnv = { ...process.env };
    afterEach(() => {
        process.env = { ...originalEnv };
    });
    it("creates auth repository", () => {
        process.env.NODE_ENV = "test";
        const repo = (0, repositoryFactory_1.createAuthRepository)();
        expect(repo).toBeDefined();
        expect(inMemoryRepository_1.createInMemoryAuthRepository).toHaveBeenCalled();
    });
    it("uses prisma when database url is set", () => {
        process.env.NODE_ENV = "development";
        process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
        (0, repositoryFactory_1.createAuthRepository)();
        expect(prismaRepository_1.createPrismaAuthRepository).toHaveBeenCalled();
    });
    it("falls back to in-memory when database url is missing", () => {
        process.env.NODE_ENV = "development";
        process.env.DATABASE_URL = "";
        (0, repositoryFactory_1.createAuthRepository)();
        expect(inMemoryRepository_1.createInMemoryAuthRepository).toHaveBeenCalled();
    });
});
