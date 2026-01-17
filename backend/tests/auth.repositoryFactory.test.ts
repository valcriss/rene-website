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

import { createAuthRepository } from "../src/auth/repositoryFactory";
import { createPrismaAuthRepository } from "../src/auth/prismaRepository";
import { createInMemoryAuthRepository } from "../src/auth/inMemoryRepository";

describe("auth repositoryFactory", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates auth repository", () => {
    process.env.NODE_ENV = "test";
    const repo = createAuthRepository();
    expect(repo).toBeDefined();
    expect(createInMemoryAuthRepository).toHaveBeenCalled();
  });

  it("uses prisma when database url is set", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    createAuthRepository();
    expect(createPrismaAuthRepository).toHaveBeenCalled();
  });

  it("falls back to in-memory when database url is missing", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "";
    createAuthRepository();
    expect(createInMemoryAuthRepository).toHaveBeenCalled();
  });
});
