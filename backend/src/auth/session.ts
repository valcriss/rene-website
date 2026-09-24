import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { AuthRepository } from "./repository";
import { signUserToken } from "./jwt";
import { AuthSession, AuthUser } from "./types";

export const ACCESS_COOKIE = "rene_access";
export const REFRESH_COOKIE = "rene_refresh";
export const CSRF_COOKIE = "rene_csrf";
export const accessTokenMinutes = 15;
export const refreshTokenAbsoluteHours = 8;
export const refreshTokenIdleMinutes = 30;

export const hashRefreshToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const generateRefreshToken = () => randomBytes(32).toString("base64url");
export const generateCsrfToken = () => randomBytes(32).toString("base64url");

export const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) return {};
  return header.split(";").reduce<Record<string, string>>((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return cookies;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
    return cookies;
  }, {});
};

export const csrfTokensMatch = (cookieToken: string | undefined, headerToken: string | undefined) => {
  if (!cookieToken || !headerToken) return false;
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  return cookieBuffer.length === headerBuffer.length && timingSafeEqual(cookieBuffer, headerBuffer);
};

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type SessionResult =
  | { ok: true; value: SessionTokens }
  | { ok: false; code: "invalid" | "reused" | "expired" | "configuration" };

const userSessionVersion = (user: AuthUser) => user.sessionVersion ?? 0;

const buildSession = (
  user: AuthUser,
  refreshToken: string,
  now: Date,
  familyId: string = randomUUID(),
  expiresAt = new Date(now.getTime() + refreshTokenAbsoluteHours * 60 * 60 * 1000)
) => ({
  id: randomUUID(),
  userId: user.id,
  familyId,
  refreshTokenHash: hashRefreshToken(refreshToken),
  sessionVersion: userSessionVersion(user),
  createdAt: now,
  lastUsedAt: now,
  expiresAt
});

const signAccessToken = (user: AuthUser, sessionId: string): SessionResult => {
  const result = signUserToken(user, sessionId);
  return result.ok
    ? { ok: true, value: { accessToken: result.value, refreshToken: "", user } }
    : { ok: false, code: "configuration" };
};

export const createSession = async (
  repo: AuthRepository,
  user: AuthUser,
  now = new Date()
): Promise<SessionResult> => {
  if (user.emailVerifiedAt === null) return { ok: false, code: "invalid" };
  const refreshToken = generateRefreshToken();
  const session = buildSession(user, refreshToken, now);
  const signed = signAccessToken(user, session.id);
  if (!signed.ok) return signed;
  await repo.createSession!(session);
  return {
    ok: true,
    value: { accessToken: signed.value.accessToken, refreshToken, user }
  };
};

const isSessionExpired = (session: AuthSession, now: Date) =>
  session.expiresAt.getTime() <= now.getTime() ||
  session.lastUsedAt.getTime() + refreshTokenIdleMinutes * 60 * 1000 <= now.getTime();

export const refreshSession = async (
  repo: AuthRepository,
  refreshToken: string,
  now = new Date()
): Promise<SessionResult> => {
  const current = await repo.getSessionByRefreshTokenHash!(hashRefreshToken(refreshToken));
  if (!current) return { ok: false, code: "invalid" };
  if (current.revokedAt) {
    await repo.revokeSessionFamily!(current.familyId);
    return { ok: false, code: "reused" };
  }
  if (isSessionExpired(current, now)) {
    await repo.revokeSessionFamily!(current.familyId);
    return { ok: false, code: "expired" };
  }

  const user = await repo.getUserById(current.userId);
  if (!user || user.emailVerifiedAt === null || userSessionVersion(user) !== current.sessionVersion) {
    await repo.revokeSessionFamily!(current.familyId);
    return { ok: false, code: "invalid" };
  }

  const nextRefreshToken = generateRefreshToken();
  const next = buildSession(user, nextRefreshToken, now, current.familyId, current.expiresAt);
  const signed = signAccessToken(user, next.id);
  if (!signed.ok) return signed;
  await repo.rotateSession!(current.id, next);
  return {
    ok: true,
    value: { accessToken: signed.value.accessToken, refreshToken: nextRefreshToken, user }
  };
};

export const revokeSession = async (repo: AuthRepository, refreshToken: string) => {
  const session = await repo.getSessionByRefreshTokenHash!(hashRefreshToken(refreshToken));
  if (session) await repo.revokeSessionFamily!(session.familyId);
};
