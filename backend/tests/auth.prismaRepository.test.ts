jest.mock("@prisma/client", () => {
  const userFindUnique = jest.fn();
  const userFindMany = jest.fn();
  const userCreate = jest.fn();
  const userUpdate = jest.fn();
  const passwordResetTokenCreate = jest.fn();
  const passwordResetTokenFindUnique = jest.fn();
  const passwordResetTokenDeleteMany = jest.fn();
  const authSessionCreate = jest.fn();
  const authSessionFindUnique = jest.fn();
  const authSessionUpdate = jest.fn();
  const authSessionUpdateMany = jest.fn();
  const transaction = jest.fn((operations: unknown[]) => Promise.all(operations));

  return {
    PrismaClient: jest.fn(() => ({
      user: {
        findUnique: userFindUnique,
        findMany: userFindMany,
        create: userCreate,
        update: userUpdate
      },
      passwordResetToken: {
        create: passwordResetTokenCreate,
        findUnique: passwordResetTokenFindUnique,
        deleteMany: passwordResetTokenDeleteMany
      },
      authSession: {
        create: authSessionCreate,
        findUnique: authSessionFindUnique,
        update: authSessionUpdate,
        updateMany: authSessionUpdateMany
      },
      $transaction: transaction
    })),
    __mocks: {
      userFindUnique,
      userFindMany,
      userCreate,
      userUpdate,
      passwordResetTokenCreate,
      passwordResetTokenFindUnique,
      passwordResetTokenDeleteMany,
      authSessionCreate,
      authSessionFindUnique,
      authSessionUpdate,
      authSessionUpdateMany,
      transaction
    }
  };
});

import { createPrismaAuthRepository } from "../src/auth/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  userFindUnique: jest.Mock;
  userFindMany: jest.Mock;
  userCreate: jest.Mock;
  userUpdate: jest.Mock;
  passwordResetTokenCreate: jest.Mock;
  passwordResetTokenFindUnique: jest.Mock;
  passwordResetTokenDeleteMany: jest.Mock;
  authSessionCreate: jest.Mock;
  authSessionFindUnique: jest.Mock;
  authSessionUpdate: jest.Mock;
  authSessionUpdateMany: jest.Mock;
  transaction: jest.Mock;
};

describe("createPrismaAuthRepository", () => {
  beforeEach(() => {
    prismaMocks.userFindUnique.mockReset();
    prismaMocks.userFindMany.mockReset();
    prismaMocks.userCreate.mockReset();
    prismaMocks.userUpdate.mockReset();
    prismaMocks.passwordResetTokenCreate.mockReset();
    prismaMocks.passwordResetTokenFindUnique.mockReset();
    prismaMocks.passwordResetTokenDeleteMany.mockReset();
    prismaMocks.authSessionCreate.mockReset();
    prismaMocks.authSessionFindUnique.mockReset();
    prismaMocks.authSessionUpdate.mockReset();
    prismaMocks.authSessionUpdateMany.mockReset();
    prismaMocks.transaction.mockClear();
  });

  it("gets user by email", async () => {
    prismaMocks.userFindUnique.mockResolvedValue({
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
    prismaMocks.userFindUnique.mockResolvedValue({
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
    prismaMocks.userFindUnique.mockResolvedValue(null);

    const repo = createPrismaAuthRepository();
    const result = await repo.getUserById("missing");

    expect(result).toBeNull();
  });

  it("returns null when user not found by email", async () => {
    prismaMocks.userFindUnique.mockResolvedValue(null);

    const repo = createPrismaAuthRepository();
    const result = await repo.getUserByEmail("missing@example.com");

    expect(result).toBeNull();
  });

  it("lists users by role", async () => {
    prismaMocks.userFindMany.mockResolvedValue([
      { id: "u1", name: "A", email: "a@test", role: "MODERATOR", passwordHash: "h1" },
      { id: "u2", name: "B", email: "b@test", role: "ADMIN", passwordHash: "h2" }
    ]);

    const repo = createPrismaAuthRepository();
    const result = await repo.listUsersByRole(["MODERATOR", "ADMIN"]);

    expect(result).toHaveLength(2);
    expect(result[0].email).toBe("a@test");
  });

  it("creates an editor user", async () => {
    prismaMocks.userCreate.mockResolvedValue({
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

    expect(prismaMocks.userCreate).toHaveBeenCalledWith({
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
    prismaMocks.userCreate.mockRejectedValue({ code: "P2002" });

    const repo = createPrismaAuthRepository();
    const result = await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash: "hash"
    });

    expect(result).toBeNull();
  });

  it("rethrows non-unique create errors", async () => {
    prismaMocks.userCreate.mockRejectedValue(new Error("boom"));

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

    expect(prismaMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hash" }
    });
  });

  it("creates a password reset token after deleting previous ones", async () => {
    const repo = createPrismaAuthRepository();
    const expiresAt = new Date("2026-05-22T11:00:00.000Z");

    await repo.createPasswordResetToken("user-1", "token-hash", expiresAt);

    expect(prismaMocks.passwordResetTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prismaMocks.passwordResetTokenCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: "token-hash",
        expiresAt
      }
    });
  });

  it("gets a password reset token by hash", async () => {
    prismaMocks.passwordResetTokenFindUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      expiresAt: new Date("2026-05-22T11:00:00.000Z")
    });

    const repo = createPrismaAuthRepository();
    const result = await repo.getPasswordResetTokenByHash("token-hash");

    expect(result).toEqual({
      id: "token-1",
      userId: "user-1",
      expiresAt: new Date("2026-05-22T11:00:00.000Z")
    });
  });

  it("returns null when password reset token is missing", async () => {
    prismaMocks.passwordResetTokenFindUnique.mockResolvedValue(null);

    const repo = createPrismaAuthRepository();
    const result = await repo.getPasswordResetTokenByHash("missing-hash");

    expect(result).toBeNull();
  });

  it("deletes password reset tokens by user id", async () => {
    const repo = createPrismaAuthRepository();

    await repo.deletePasswordResetTokensByUserId("user-1");

    expect(prismaMocks.passwordResetTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("persists, reads, rotates and revokes sessions", async () => {
    const repo = createPrismaAuthRepository();
    const now = new Date("2026-09-24T10:00:00.000Z");
    const input = {
      id: "session-1",
      userId: "user-1",
      familyId: "family-1",
      refreshTokenHash: "hash-1",
      sessionVersion: 0,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: new Date("2026-09-24T18:00:00.000Z")
    };
    const stored = { ...input, revokedAt: null };
    prismaMocks.authSessionFindUnique.mockResolvedValue(stored);

    await repo.createSession!(input);
    expect(prismaMocks.authSessionCreate).toHaveBeenCalledWith({ data: input });
    await expect(repo.getSessionById!("session-1")).resolves.toEqual(stored);
    expect(prismaMocks.authSessionFindUnique).toHaveBeenCalledWith({ where: { id: "session-1" } });
    await expect(repo.getSessionByRefreshTokenHash!("hash-1")).resolves.toEqual(stored);
    expect(prismaMocks.authSessionFindUnique).toHaveBeenCalledWith({ where: { refreshTokenHash: "hash-1" } });

    const next = { ...input, id: "session-2", refreshTokenHash: "hash-2" };
    await repo.rotateSession!("session-1", next);
    expect(prismaMocks.authSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { revokedAt: expect.any(Date) }
    });
    expect(prismaMocks.authSessionCreate).toHaveBeenCalledWith({ data: next });

    await repo.revokeSessionFamily!("family-1");
    expect(prismaMocks.authSessionUpdateMany).toHaveBeenCalledWith({
      where: { familyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });

  it("increments session version and revokes all user sessions", async () => {
    const repo = createPrismaAuthRepository();
    await repo.invalidateUserSessions!("user-1");
    expect(prismaMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { sessionVersion: { increment: 1 } }
    });
    expect(prismaMocks.authSessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(prismaMocks.transaction).toHaveBeenCalledTimes(1);
  });
});
