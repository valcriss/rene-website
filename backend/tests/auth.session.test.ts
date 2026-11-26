import {
  createSession,
  csrfTokensMatch,
  generateCsrfToken,
  generateRefreshToken,
  hashRefreshToken,
  parseCookies,
  DEFAULT_SESSION_IDLE_MINUTES,
  DEFAULT_SESSION_MAX_HOURS,
  getSessionIdleMinutes,
  getSessionMaxHours,
  refreshSession,
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

    const idle = await createSession(repo, user, now);
    if (!idle.ok) return;
    expect(await refreshSession(
      repo,
      idle.value.refreshToken,
      new Date(now.getTime() + DEFAULT_SESSION_IDLE_MINUTES * 60_000)
    )).toEqual({ ok: false, code: "expired" });
  });

  it("keeps an active session alive past the old 30-minute idle window", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    const now = new Date("2026-09-24T10:00:00.000Z");
    const created = await createSession(repo, user, now);
    if (!created.ok) return;

    const refreshed = await refreshSession(repo, created.value.refreshToken, new Date(now.getTime() + 90 * 60_000));
    expect(refreshed.ok).toBe(true);
  });

  it("ends a session at its absolute lifetime even when it keeps being refreshed", async () => {
    process.env.SESSION_MAX_HOURS = "1";
    try {
      const repo = createInMemoryAuthRepository();
      const user = await createUser(repo);
      const now = new Date("2026-09-24T10:00:00.000Z");
      const created = await createSession(repo, user, now);
      if (!created.ok) return;

      const first = await refreshSession(repo, created.value.refreshToken, new Date(now.getTime() + 40 * 60_000));
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(await refreshSession(repo, first.value.refreshToken, new Date(now.getTime() + 60 * 60_000)))
        .toEqual({ ok: false, code: "expired" });
    } finally {
      delete process.env.SESSION_MAX_HOURS;
    }
  });

  describe("session durations", () => {
    afterEach(() => {
      delete process.env.SESSION_IDLE_MINUTES;
      delete process.env.SESSION_MAX_HOURS;
    });

    it("defaults to a 2-hour idle window and a 7-day absolute lifetime", () => {
      expect(DEFAULT_SESSION_IDLE_MINUTES).toBe(120);
      expect(DEFAULT_SESSION_MAX_HOURS).toBe(168);
      expect(getSessionIdleMinutes()).toBe(120);
      expect(getSessionMaxHours()).toBe(168);
    });

    it("reads positive integer overrides from the environment", () => {
      process.env.SESSION_IDLE_MINUTES = " 45 ";
      process.env.SESSION_MAX_HOURS = "24";
      expect(getSessionIdleMinutes()).toBe(45);
      expect(getSessionMaxHours()).toBe(24);
    });

    it.each(["", "abc", "0", "-5", "1.5"])("falls back to defaults for invalid value %p", (value) => {
      process.env.SESSION_IDLE_MINUTES = value;
      process.env.SESSION_MAX_HOURS = value;
      expect(getSessionIdleMinutes()).toBe(DEFAULT_SESSION_IDLE_MINUTES);
      expect(getSessionMaxHours()).toBe(DEFAULT_SESSION_MAX_HOURS);
    });
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

  it("rejects sessions for suspended accounts", async () => {
    const repo = createInMemoryAuthRepository();
    const user = await createUser(repo);
    const suspended = { ...user, accountStatus: "SUSPENDED" as const };

    expect(await createSession(repo, suspended)).toEqual({ ok: false, code: "invalid" });
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
