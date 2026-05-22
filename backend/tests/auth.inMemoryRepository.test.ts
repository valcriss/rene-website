import { createInMemoryAuthRepository } from "../src/auth/inMemoryRepository";
import { hashPassword, verifyPassword } from "../src/auth/password";

describe("inMemoryAuthRepository", () => {
  it("returns empty results", async () => {
    const repo = createInMemoryAuthRepository();

    expect(await repo.getUserByEmail("x@test")).toBeNull();
    expect(await repo.getUserById("id")).toBeNull();
    expect(await repo.listUsersByRole(["ADMIN"])).toEqual([]);
  });

  it("creates an editor user", async () => {
    const repo = createInMemoryAuthRepository();
    const passwordHash = await hashPassword("secret123");

    const user = await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash
    });

    expect(user).toEqual({
      id: expect.any(String),
      name: "Writer",
      email: "writer@example.com",
      role: "EDITOR"
    });
    const storedByEmail = await repo.getUserByEmail("writer@example.com");
    const storedById = await repo.getUserById(user!.id);

    expect(storedByEmail).toMatchObject({
      id: user?.id,
      name: "Writer",
      email: "writer@example.com",
      role: "EDITOR"
    });
    expect(storedById).toMatchObject({
      id: user?.id,
      name: "Writer",
      email: "writer@example.com",
      role: "EDITOR"
    });
    await expect(verifyPassword("secret123", storedByEmail!.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("secret123", storedById!.passwordHash)).resolves.toBe(true);
    expect(await repo.listUsersByRole(["EDITOR"])).toHaveLength(1);
  });

  it("rejects duplicate email when creating an editor user", async () => {
    const repo = createInMemoryAuthRepository();

    await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash: await hashPassword("secret123")
    });

    const duplicate = await repo.createEditorUser({
      name: "Writer 2",
      email: "writer@example.com",
      passwordHash: await hashPassword("secret456")
    });

    expect(duplicate).toBeNull();
  });

  it("updates a stored password hash", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash: await hashPassword("secret123")
    });
    const nextPasswordHash = await hashPassword("secret456");

    await repo.updatePasswordHash(user!.id, nextPasswordHash);

    const storedUser = await repo.getUserById(user!.id);
    await expect(verifyPassword("secret456", storedUser!.passwordHash)).resolves.toBe(true);
  });

  it("stores and replaces a password reset token", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash: await hashPassword("secret123")
    });

    await repo.createPasswordResetToken(user!.id, "hash-1", new Date("2026-05-22T10:00:00.000Z"));
    await repo.createPasswordResetToken(user!.id, "hash-2", new Date("2026-05-22T11:00:00.000Z"));

    expect(await repo.getPasswordResetTokenByHash("hash-1")).toBeNull();
    expect(await repo.getPasswordResetTokenByHash("hash-2")).toEqual({
      id: expect.any(String),
      userId: user!.id,
      expiresAt: new Date("2026-05-22T11:00:00.000Z")
    });
  });

  it("deletes password reset tokens by user id", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await repo.createEditorUser({
      name: "Writer",
      email: "writer@example.com",
      passwordHash: await hashPassword("secret123")
    });

    await repo.createPasswordResetToken(user!.id, "hash-1", new Date("2026-05-22T10:00:00.000Z"));
    await repo.deletePasswordResetTokensByUserId(user!.id);

    expect(await repo.getPasswordResetTokenByHash("hash-1")).toBeNull();
  });
});
