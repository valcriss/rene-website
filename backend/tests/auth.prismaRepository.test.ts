jest.mock("@prisma/client", () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const create = jest.fn();
  const update = jest.fn();

  return {
    PrismaClient: jest.fn(() => ({
      user: {
        findUnique,
        findMany,
        create,
        update
      }
    })),
    __mocks: {
      findUnique,
      findMany,
      create,
      update
    }
  };
});

import { createPrismaAuthRepository } from "../src/auth/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

describe("createPrismaAuthRepository", () => {
  beforeEach(() => {
    prismaMocks.findUnique.mockReset();
    prismaMocks.findMany.mockReset();
    prismaMocks.create.mockReset();
    prismaMocks.update.mockReset();
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

  it("creates an editor user", async () => {
    prismaMocks.create.mockResolvedValue({
      id: "created-user",
      name: "Writer",
      email: "writer@example.com",
      role: "EDITOR",
      passwordHash: "hash"
    });

    const repo = createPrismaAuthRepository();
    const result = await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash: "hash"
    });

    expect(prismaMocks.create).toHaveBeenCalledWith({
      data: {
        name: "Writer",
        email: "writer@example.com",
        role: "EDITOR",
        passwordHash: "hash"
      }
    });
    expect(result).toEqual({
      id: "created-user",
      name: "Writer",
      email: "writer@example.com",
      role: "EDITOR"
    });
  });

  it("returns null when create hits unique constraint", async () => {
    prismaMocks.create.mockRejectedValue({ code: "P2002" });

    const repo = createPrismaAuthRepository();
    const result = await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash: "hash"
    });

    expect(result).toBeNull();
  });

  it("rethrows non-unique create errors", async () => {
    prismaMocks.create.mockRejectedValue(new Error("boom"));

    const repo = createPrismaAuthRepository();

    await expect(
      repo.createEditorUser({
        name: "Writer",
        email: "writer@example.com",
        passwordHash: "hash"
      })
    ).rejects.toThrow("boom");
  });

  it("updates a password hash", async () => {
    const repo = createPrismaAuthRepository();

    await repo.updatePasswordHash("user-1", "hash");

    expect(prismaMocks.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hash" }
    });
  });
});
