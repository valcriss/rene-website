import { createHash } from "node:crypto";
import { normalizeEmail } from "../src/auth/email";
import {
  buildEmailVerificationUrl,
  emailVerificationTtlMinutes,
  generateEmailVerificationToken,
  hashEmailVerificationToken
} from "../src/auth/emailVerification";
import { createInMemoryAuthRepository } from "../src/auth/inMemoryRepository";
import { maximumPasswordLength, minimumPasswordLength, validatePassword } from "../src/auth/password";
import { checkAuthThrottle, clearLoginThrottle } from "../src/auth/rateLimiter";
import { AuthRepository } from "../src/auth/repository";
import { login, signup, verifyEmail } from "../src/auth/service";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

describe("authentication hardening", () => {
  it("canonicalises email addresses and rejects malformed identifiers", () => {
    expect(normalizeEmail("  Alice@EXAMPLE.COM ")).toBe("alice@example.com");
    expect(normalizeEmail("Ｆoo@EXAMPLE.com")).toBe("foo@example.com");
    expect(normalizeEmail("name@localhost")).toBe("name@localhost");
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail("missing-at")).toBeNull();
    expect(normalizeEmail("a@b@c")).toBeNull();
    expect(normalizeEmail("@example.com")).toBeNull();
    expect(normalizeEmail("name@")).toBeNull();
  });

  it("uses opaque verification tokens and a controlled application URL", () => {
    const token = generateEmailVerificationToken();
    expect(token).toHaveLength(43);
    expect(hashEmailVerificationToken(token)).toHaveLength(64);
    expect(buildEmailVerificationUrl(token, { PUBLIC_APP_URL: "https://rene.example.test/base" }))
      .toBe(`https://rene.example.test/verify-email?token=${token}`);
    expect(buildEmailVerificationUrl(token, {})).toContain("http://localhost:3000/verify-email");
    expect(emailVerificationTtlMinutes).toBe(1440);
  });

  it("bounds passphrases without composition requirements", () => {
    expect(minimumPasswordLength).toBe(15);
    expect(maximumPasswordLength).toBe(128);
    expect(validatePassword("short")).toEqual(["Le mot de passe doit contenir au moins 15 caractères."]);
    expect(validatePassword("x".repeat(129))).toEqual(["Le mot de passe ne peut pas dépasser 128 caractères."]);
    expect(validatePassword("une phrase de passe ✔")).toEqual([]);
  });

  it("creates an unverified public account, normalises its email and consumes verification once", async () => {
    let verificationHash = "";
    const createUnverifiedEditorUser = jest.fn(async (input: { name: string; email: string }) => ({
      id: "new-user", name: input.name, email: input.email, role: "EDITOR" as const, emailVerifiedAt: null
    }));
    const repo: AuthRepository = {
      getUserByEmail: async () => null,
      getUserById: async () => null,
      listUsersByRole: async () => [],
      createEditorUser: async () => null,
      createUnverifiedEditorUser,
      updatePasswordHash: async () => undefined,
      createPasswordResetToken: async () => undefined,
      getPasswordResetTokenByHash: async () => null,
      deletePasswordResetTokensByUserId: async () => undefined,
      createEmailVerificationToken: async (_userId, tokenHash) => {
        verificationHash = tokenHash;
      },
      getEmailVerificationTokenByHash: async (tokenHash) => tokenHash === verificationHash
        ? { id: "verification", userId: "new-user", expiresAt: new Date(Date.now() + 60_000) }
        : null,
      deleteEmailVerificationTokensByUserId: jest.fn(async () => undefined),
      markEmailVerified: jest.fn(async () => undefined)
    };

    const result = await signup(repo, {
      name: "Alice",
      email: " Alice@EXAMPLE.COM ",
      password: "correct horse battery",
      passwordConfirmation: "correct horse battery"
    });
    expect(result.ok).toBe(true);
    expect(createUnverifiedEditorUser.mock.calls[0][0].email).toBe("alice@example.com");
    expect(verificationHash).toHaveLength(64);
    expect((await login(repo, { email: "alice@example.com", password: "correct horse battery" })).ok).toBe(false);

    // The hash is deliberately opaque: a different token cannot activate the account.
    await expect(verifyEmail(repo, "wrong")).resolves.toMatchObject({ ok: false, code: "invalid_token" });
  });

  it("activates and expires email verification tokens safely", async () => {
    const markEmailVerified = jest.fn(async () => undefined);
    const deleteEmailVerificationTokensByUserId = jest.fn(async () => undefined);
    const repo = {
      getEmailVerificationTokenByHash: async (tokenHash: string) => tokenHash === hash("valid")
        ? { id: "v", userId: "user", expiresAt: new Date(Date.now() + 60_000) }
        : tokenHash === hash("expired")
          ? { id: "e", userId: "expired-user", expiresAt: new Date(Date.now() - 1) }
          : null,
      markEmailVerified,
      deleteEmailVerificationTokensByUserId
    } as unknown as AuthRepository;

    await expect(verifyEmail(repo, "valid")).resolves.toMatchObject({ ok: true });
    expect(markEmailVerified).toHaveBeenCalledWith("user");
    await expect(verifyEmail(repo, "expired")).resolves.toMatchObject({ ok: false, code: "expired_token" });
    expect(deleteEmailVerificationTokensByUserId).toHaveBeenCalledWith("expired-user");
  });

  it("stores, retrieves and verifies an in-memory public account", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await repo.createUnverifiedEditorUser!({
      name: "Pending", email: "pending@test", passwordHash: "hash"
    });
    if (!user) throw new Error("user creation failed");
    await expect(repo.createUnverifiedEditorUser!({ name: "Pending", email: "pending@test", passwordHash: "hash" })).resolves.toBeNull();
    await repo.createEmailVerificationToken!(user.id, "token-hash", new Date(Date.now() + 60_000));
    await expect(repo.getEmailVerificationTokenByHash!("missing")).resolves.toBeNull();
    await expect(repo.getEmailVerificationTokenByHash!("token-hash")).resolves.toMatchObject({ userId: user.id });
    await repo.markEmailVerified!(user.id);
    expect((await repo.getUserById(user.id))?.emailVerifiedAt).toBeInstanceOf(Date);
    await repo.deleteEmailVerificationTokensByUserId!(user.id);
    await expect(repo.getEmailVerificationTokenByHash!("token-hash")).resolves.toBeNull();
  });

  it("enforces temporary progressive limits across concurrent attempts", async () => {
    const repo = createInMemoryAuthRepository();
    const now = new Date("2026-09-24T10:00:00.000Z");
    const limit = { max: 2, windowMs: 60_000 };
    const first = await repo.consumeRateLimit!({ key: "k", limit, now });
    const second = await repo.consumeRateLimit!({ key: "k", limit, now });
    const blocked = await repo.consumeRateLimit!({ key: "k", limit, now });
    const whileBlocked = await repo.consumeRateLimit!({ key: "k", limit, now: new Date(now.getTime() + 1000) });
    const nextWindow = await repo.consumeRateLimit!({ key: "k", limit, now: new Date(now.getTime() + 61_000) });
    expect([first.allowed, second.allowed, blocked.allowed, whileBlocked.allowed, nextWindow.allowed])
      .toEqual([true, true, false, false, true]);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("combines hashed IP and account limits and clears a successful login account limit", async () => {
    const consumeRateLimit = jest.fn(async () => ({ allowed: true, retryAfterSeconds: 0 }));
    const clearRateLimit = jest.fn(async () => undefined);
    const repo = { consumeRateLimit, clearRateLimit } as unknown as AuthRepository;
    await expect(checkAuthThrottle(repo, "login", "127.0.0.1", "user@example.com"))
      .resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(consumeRateLimit).toHaveBeenCalledTimes(2);
    await clearLoginThrottle(repo, "user@example.com");
    expect(clearRateLimit).toHaveBeenCalledWith(expect.stringMatching(/^auth:login:account:[a-f0-9]{64}$/));

    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 12 });
    await expect(checkAuthThrottle(repo, "signup", "127.0.0.1")).resolves.toEqual({ allowed: false, retryAfterSeconds: 12 });
    await expect(checkAuthThrottle({} as AuthRepository, "forgot-password", "127.0.0.1"))
      .resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    await clearLoginThrottle({} as AuthRepository, "user@example.com");
  });
});
