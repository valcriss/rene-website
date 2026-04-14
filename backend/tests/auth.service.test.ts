import { createHash } from "node:crypto";
import { login, signup } from "../src/auth/service";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { AuthRepository } from "../src/auth/repository";

const buildRepo = (
  passwordHash: string | null,
  createEditorUser?: AuthRepository["createEditorUser"],
  updatePasswordHash?: AuthRepository["updatePasswordHash"]
): AuthRepository => ({
  getUserByEmail: async (email) =>
    passwordHash && email === "test@example.com"
      ? {
          id: "user-1",
          name: "Test",
          email: "test@example.com",
          role: "EDITOR",
          passwordHash
        }
      : null,
  getUserById: async () => null,
  listUsersByRole: async () => [],
  createEditorUser:
    createEditorUser ??
    (async ({ name, email }) => ({
      id: "created-user",
      name,
      email,
      role: "EDITOR"
    })),
  updatePasswordHash: updatePasswordHash ?? (async () => undefined)
});

describe("auth service", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("returns validation errors", async () => {
    const repo = buildRepo(await hashPassword("secret"));
    const result = await login(repo, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("L'email est requis.");
      expect(result.errors).toContain("Le mot de passe est requis.");
    }
  });

  it("returns error when payload is not an object", async () => {
    const repo = buildRepo(await hashPassword("secret"));
    const result = await login(repo, null);
    expect(result.ok).toBe(false);
  });

  it("returns invalid credentials", async () => {
    const repo = buildRepo(await hashPassword("secret"));
    const result = await login(repo, { email: "test@example.com", password: "wrong" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Identifiants invalides.");
    }
  });

  it("logs in with token", async () => {
    const repo = buildRepo(await hashPassword("secret"));
    const result = await login(repo, { email: "test@example.com", password: "secret" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.token).toBeDefined();
    expect(result.value.user.email).toBe("test@example.com");
  });

  it("rehashes a legacy sha256 password after successful login", async () => {
    const legacyHash = createHash("sha256").update("secret").digest("hex");
    const updatePasswordHash = jest.fn<Promise<void>, [string, string]>(async () => undefined);
    const repo = buildRepo(legacyHash, undefined, updatePasswordHash);

    const result = await login(repo, { email: "test@example.com", password: "secret" });

    expect(result.ok).toBe(true);
    expect(updatePasswordHash).toHaveBeenCalledTimes(1);
    expect(updatePasswordHash).toHaveBeenCalledWith("user-1", expect.any(String));
    await expect(verifyPassword("secret", updatePasswordHash.mock.calls[0][1])).resolves.toBe(true);
  });

  it("does not rehash when the stored password is already argon2", async () => {
    const updatePasswordHash = jest.fn<Promise<void>, [string, string]>(async () => undefined);
    const repo = buildRepo(await hashPassword("secret"), undefined, updatePasswordHash);

    const result = await login(repo, { email: "test@example.com", password: "secret" });

    expect(result.ok).toBe(true);
    expect(updatePasswordHash).not.toHaveBeenCalled();
  });

  it("keeps login successful when legacy rehash fails", async () => {
    const legacyHash = createHash("sha256").update("secret").digest("hex");
    const repo = buildRepo(legacyHash, undefined, async () => {
      throw new Error("boom");
    });

    const result = await login(repo, { email: "test@example.com", password: "secret" });

    expect(result.ok).toBe(true);
  });

  it("returns error when JWT secret is missing", async () => {
    delete process.env.JWT_SECRET;
    const repo = buildRepo(await hashPassword("secret"));
    const result = await login(repo, { email: "test@example.com", password: "secret" });
    expect(result.ok).toBe(false);
  });

  it("returns signup validation errors", async () => {
    const repo = buildRepo(null);
    const result = await signup(repo, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation");
      expect(result.errors).toContain("Le nom est requis.");
      expect(result.errors).toContain("L'email est requis.");
      expect(result.errors).toContain("Le mot de passe est requis.");
      expect(result.errors).toContain("La confirmation du mot de passe est requise.");
    }
  });

  it("returns signup error when payload is not an object", async () => {
    const repo = buildRepo(null);
    const result = await signup(repo, null);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation");
      expect(result.errors).toEqual(["Le corps de la requête doit être un objet."]);
    }
  });

  it("validates email and password rules during signup", async () => {
    const repo = buildRepo(null);
    const result = await signup(repo, {
      name: "Test",
      email: "invalid",
      password: "short",
      passwordConfirmation: "other"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("L'email est invalide.");
      expect(result.errors).toContain("Le mot de passe doit contenir au moins 8 caractères.");
      expect(result.errors).toContain("Les mots de passe ne correspondent pas.");
    }
  });

  it("returns conflict when signup email already exists", async () => {
    const repo = buildRepo(await hashPassword("secret"));
    const result = await signup(repo, {
      name: "Test",
      email: "test@example.com",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("conflict");
      expect(result.errors).toEqual(["Un compte existe déjà avec cet email."]);
    }
  });

  it("returns conflict when repository rejects duplicate signup", async () => {
    const repo = buildRepo(null, async () => null);
    const result = await signup(repo, {
      name: "Test",
      email: "new@example.com",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("conflict");
    }
  });

  it("signs up with editor role and token", async () => {
    const createEditorUser = jest.fn(async ({ name, email }) => ({
      id: "created-user",
      name,
      email,
      role: "EDITOR" as const
    }));
    const repo = buildRepo(null, createEditorUser);

    const result = await signup(repo, {
      name: "New User",
      email: "new@example.com",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expectedHash = createEditorUser.mock.calls[0][0].passwordHash;

    expect(createEditorUser).toHaveBeenCalledWith({
      name: "New User",
      email: "new@example.com",
      passwordHash: expectedHash
    });
    await expect(verifyPassword("secret123", expectedHash)).resolves.toBe(true);
    expect(result.value.user.role).toBe("EDITOR");
    expect(result.value.token).toBeDefined();
  });

  it("returns signup error when JWT secret is missing", async () => {
    delete process.env.JWT_SECRET;
    const repo = buildRepo(null);
    const result = await signup(repo, {
      name: "New User",
      email: "new@example.com",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation");
    }
  });
});
