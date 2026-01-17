jest.mock("@prisma/client", () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();

  return {
    PrismaClient: jest.fn(() => ({
      user: {
        findUnique,
        findMany
      }
    })),
    __mocks: {
      findUnique,
      findMany
    }
  };
});

import { createPrismaAuthRepository } from "../src/auth/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
};

describe("createPrismaAuthRepository", () => {
  beforeEach(() => {
    prismaMocks.findUnique.mockReset();
    prismaMocks.findMany.mockReset();
  });

  it("gets user by email", async () => {
    prismaMocks.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Test",
      email: "test@example.com",
      role: "EDITOR",
      passwordHash: "hash"
    });

    const repo = createPrismaAuthRepository();
    const result = await repo.getUserByEmail("test@example.com");

    expect(result?.email).toBe("test@example.com");
  });

  it("gets user by id", async () => {
    prismaMocks.findUnique.mockResolvedValue({
      id: "user-2",
      name: "Test",
      email: "id@example.com",
      role: "ADMIN",
      passwordHash: "hash"
    });

    const repo = createPrismaAuthRepository();
    const result = await repo.getUserById("user-2");

    expect(result?.id).toBe("user-2");
  });

  it("returns null when user not found", async () => {
    prismaMocks.findUnique.mockResolvedValue(null);

    const repo = createPrismaAuthRepository();
    const result = await repo.getUserById("missing");

    expect(result).toBeNull();
  });

  it("returns null when user not found by email", async () => {
    prismaMocks.findUnique.mockResolvedValue(null);

    const repo = createPrismaAuthRepository();
    const result = await repo.getUserByEmail("missing@example.com");

    expect(result).toBeNull();
  });

  it("lists users by role", async () => {
    prismaMocks.findMany.mockResolvedValue([
      { id: "u1", name: "A", email: "a@test", role: "MODERATOR", passwordHash: "h1" },
      { id: "u2", name: "B", email: "b@test", role: "ADMIN", passwordHash: "h2" }
    ]);

    const repo = createPrismaAuthRepository();
    const result = await repo.listUsersByRole(["MODERATOR", "ADMIN"]);

    expect(result).toHaveLength(2);
    expect(result[0].email).toBe("a@test");
  });
});
