import {
  createSession,
  csrfTokensMatch,
  generateCsrfToken,
  generateRefreshToken,
  hashRefreshToken,
  parseCookies,
  refreshSession,
  refreshTokenIdleMinutes,
  revokeSession
} from "../src/auth/session";
import { createInMemoryAuthRepository } from "../src/auth/inMemoryRepository";

const createUser = async (repo: ReturnType<typeof createInMemoryAuthRepository>) => {
  const user = await repo.createEditorUser({ name: "Writer", email: "writer@test", passwordHash: "hash" });
  if (!user) throw new Error("user creation failed");
  const stored = await repo.getUserById(user.id);
  if (!stored) throw new Error("user lookup failed");
  return stored;
};

describe("auth sessions", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("parses cookies defensively and compares CSRF tokens in constant time", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("a=hello%20world; invalid; broken=%E0%A4%A; empty=")).toEqual({
      a: "hello world",
      broken: "%E0%A4%A",
      empty: ""
    });
    expect(csrfTokensMatch("same", "same")).toBe(true);
    expect(csrfTokensMatch(undefined, "same")).toBe(false);
    expect(csrfTokensMatch("same", undefined)).toBe(false);
    expect(csrfTokensMatch("short", "longer")).toBe(false);
    expect(csrfTokensMatch("same", "diff")).toBe(false);
    expect(generateRefreshToken()).toHaveLength(43);
    expect(generateCsrfToken()).toHaveLength(43);
    expect(hashRefreshToken("token")).toHaveLength(64);
  });

  it("creates, rotates and revokes a server-side session", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    const now = new Date("2026-09-24T10:00:00.000Z");
    const created = await createSession(repo, user, now);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const stored = await repo.getSessionByRefreshTokenHash!(hashRefreshToken(created.value.refreshToken));
    expect(stored).toMatchObject({ userId: user.id, sessionVersion: 0, revokedAt: null });

    const rotated = await refreshSession(repo, created.value.refreshToken, new Date(now.getTime() + 60_000));
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.value.refreshToken).not.toBe(created.value.refreshToken);
    expect((await repo.getSessionById!(stored!.id))?.revokedAt).toBeInstanceOf(Date);

    const replay = await refreshSession(repo, created.value.refreshToken, new Date(now.getTime() + 120_000));
    expect(replay).toEqual({ ok: false, code: "reused" });
    const rotatedRecord = await repo.getSessionByRefreshTokenHash!(hashRefreshToken(rotated.value.refreshToken));
    expect(rotatedRecord?.revokedAt).toBeInstanceOf(Date);

    await revokeSession(repo, rotated.value.refreshToken);
    await revokeSession(repo, "unknown");
  });

  it("rejects missing, absolute-expired and idle-expired refresh tokens", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    const now = new Date("2026-09-24T10:00:00.000Z");
    expect(await refreshSession(repo, "missing", now)).toEqual({ ok: false, code: "invalid" });

    const absolute = await createSession(repo, user, now);
    if (!absolute.ok) return;
    expect(await refreshSession(repo, absolute.value.refreshToken, new Date("2026-09-25T10:00:00.000Z")))
      .toEqual({ ok: false, code: "expired" });

    const idle = await createSession(repo, user, now);
    if (!idle.ok) return;
    expect(await refreshSession(
      repo,
      idle.value.refreshToken,
      new Date(now.getTime() + refreshTokenIdleMinutes * 60_000)
    )).toEqual({ ok: false, code: "expired" });
  });

  it("rejects refresh after account invalidation or deletion", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    const created = await createSession(repo, user);
    if (!created.ok) return;
    await repo.invalidateUserSessions!(user.id);
    expect(await refreshSession(repo, created.value.refreshToken)).toEqual({ ok: false, code: "reused" });

    const deletedRepo = createInMemoryAuthRepository();
    const deletedUser = await createUser(deletedRepo);
    const deletedSession = await createSession(deletedRepo, deletedUser);
    if (!deletedSession.ok) return;
    deletedRepo.getUserById = async () => null;
    expect(await refreshSession(deletedRepo, deletedSession.value.refreshToken)).toEqual({ ok: false, code: "invalid" });
  });

  it("rejects a session-version mismatch", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    const created = await createSession(repo, user);
    if (!created.ok) return;
    repo.getUserById = async () => ({ ...user, sessionVersion: 2 });
    expect(await refreshSession(repo, created.value.refreshToken)).toEqual({ ok: false, code: "invalid" });
  });

  it("reports JWT configuration failures before persisting or rotating", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    delete process.env.JWT_SECRET;
    expect(await createSession(repo, user)).toEqual({ ok: false, code: "configuration" });

    process.env.JWT_SECRET = "test-secret";
    const created = await createSession(repo, user);
    if (!created.ok) return;
    delete process.env.JWT_SECRET;
    expect(await refreshSession(repo, created.value.refreshToken)).toEqual({ ok: false, code: "configuration" });
  });

  it("does not create a session before public email verification", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await repo.createUnverifiedEditorUser!({ name: "Pending", email: "pending@test", passwordHash: "hash" });
    if (!user) throw new Error("user creation failed");
    expect(await createSession(repo, user)).toEqual({ ok: false, code: "invalid" });
  });

  it("handles rotation without a previous record and invalidates only matching active sessions", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    const now = new Date();
    await repo.rotateSession!("missing", {
      id: "next",
      userId: user.id,
      familyId: "family",
      refreshTokenHash: "next-hash",
      sessionVersion: 0,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + 60_000)
    });
    expect(await repo.getSessionById!("missing")).toBeNull();
    await repo.revokeSessionFamily!("other-family");
    await repo.invalidateUserSessions!("other-user");
    expect(await repo.getSessionById!("next")).toMatchObject({ revokedAt: null });
  });
});
