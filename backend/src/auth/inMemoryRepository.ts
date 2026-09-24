import { randomUUID } from "node:crypto";
import { AuthRepository } from "./repository";
import { UserRole } from "./roles";
import {
  AuthEmailVerificationToken,
  AuthPasswordResetToken,
  AuthSession,
  ConsumeRateLimitInput,
  ConsumeRateLimitResult
} from "./types";

type RateLimitEntry = { attempts: number; windowStartedAt: Date; blockedUntil: Date | null };

const consumeRateLimit = (
  entries: Map<string, RateLimitEntry>,
  { key, limit, now }: ConsumeRateLimitInput
): ConsumeRateLimitResult => {
  const current = entries.get(key);
  if (current?.blockedUntil && current.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil.getTime() - now.getTime()) / 1000))
    };
  }

  const isNewWindow = !current || now.getTime() - current.windowStartedAt.getTime() >= limit.windowMs;
  const attempts = isNewWindow ? 1 : current.attempts + 1;
  const blockedUntil = attempts > limit.max
    ? new Date(now.getTime() + Math.min(15 * 60, 5 * 2 ** (attempts - limit.max - 1)) * 1000)
    : null;
  entries.set(key, { attempts, windowStartedAt: isNewWindow ? now : current.windowStartedAt, blockedUntil });

  return blockedUntil
    ? { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000) }
    : { allowed: true, retryAfterSeconds: 0 };
};

export const createInMemoryAuthRepository = (): AuthRepository => {
  const users = new Map<string, {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
    sessionVersion: number;
    emailVerifiedAt: Date | null;
  }>();
  const passwordResetTokens = new Map<string, AuthPasswordResetToken & { tokenHash: string }>();
  const emailVerificationTokens = new Map<string, AuthEmailVerificationToken & { tokenHash: string }>();
  const sessions = new Map<string, AuthSession>();
  const rateLimits = new Map<string, RateLimitEntry>();

  return {
    getUserByEmail: async (email) => users.get(email) ?? null,
    getUserById: async (id) => {
      for (const user of users.values()) {
        if (user.id === id) {
          return user;
        }
      }

      return null;
    },
    listUsersByRole: async (roles) =>
      Array.from(users.values()).filter((user) => roles.includes(user.role)),
    createEditorUser: async ({ name, email, passwordHash }) => {
      if (users.has(email)) {
        return null;
      }

      const user = {
        id: randomUUID(),
        name,
        email,
        role: "EDITOR" as const,
        passwordHash,
        sessionVersion: 0,
        emailVerifiedAt: new Date()
      };

      users.set(email, user);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
    },
    createUnverifiedEditorUser: async ({ name, email, passwordHash }) => {
      if (users.has(email)) return null;
      const user = {
        id: randomUUID(),
        name,
        email,
        role: "EDITOR" as const,
        passwordHash,
        sessionVersion: 0,
        emailVerifiedAt: null
      };
      users.set(email, user);
      return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerifiedAt: null };
    },
    updatePasswordHash: async (userId, passwordHash) => {
      for (const [email, user] of users.entries()) {
        if (user.id === userId) {
          users.set(email, {
            ...user,
            passwordHash
          });
          return;
        }
      }
    },
    createPasswordResetToken: async (userId, tokenHash, expiresAt) => {
      passwordResetTokens.delete(userId);
      passwordResetTokens.set(userId, {
        id: randomUUID(),
        userId,
        tokenHash,
        expiresAt
      });
    },
    getPasswordResetTokenByHash: async (tokenHash) => {
      for (const token of passwordResetTokens.values()) {
        if (token.tokenHash === tokenHash) {
          return {
            id: token.id,
            userId: token.userId,
            expiresAt: token.expiresAt
          };
        }
      }

      return null;
    },
    deletePasswordResetTokensByUserId: async (userId) => {
      passwordResetTokens.delete(userId);
    },
    createEmailVerificationToken: async (userId, tokenHash, expiresAt) => {
      emailVerificationTokens.delete(userId);
      emailVerificationTokens.set(userId, { id: randomUUID(), userId, tokenHash, expiresAt });
    },
    getEmailVerificationTokenByHash: async (tokenHash) => {
      for (const token of emailVerificationTokens.values()) {
        if (token.tokenHash === tokenHash) {
          return { id: token.id, userId: token.userId, expiresAt: token.expiresAt };
        }
      }
      return null;
    },
    deleteEmailVerificationTokensByUserId: async (userId) => {
      emailVerificationTokens.delete(userId);
    },
    markEmailVerified: async (userId) => {
      for (const [email, user] of users) {
        if (user.id === userId) users.set(email, { ...user, emailVerifiedAt: new Date() });
      }
    },
    createSession: async (input) => {
      sessions.set(input.id, { ...input, revokedAt: null });
    },
    getSessionById: async (id) => sessions.get(id) ?? null,
    getSessionByRefreshTokenHash: async (refreshTokenHash) =>
      Array.from(sessions.values()).find((session) => session.refreshTokenHash === refreshTokenHash) ?? null,
    rotateSession: async (currentSessionId, nextSession) => {
      const current = sessions.get(currentSessionId);
      if (current) sessions.set(currentSessionId, { ...current, revokedAt: new Date() });
      sessions.set(nextSession.id, { ...nextSession, revokedAt: null });
    },
    revokeSessionFamily: async (familyId) => {
      const revokedAt = new Date();
      for (const [id, session] of sessions) {
        if (session.familyId === familyId && !session.revokedAt) sessions.set(id, { ...session, revokedAt });
      }
    },
    invalidateUserSessions: async (userId) => {
      const revokedAt = new Date();
      for (const [email, user] of users) {
        if (user.id === userId) users.set(email, { ...user, sessionVersion: user.sessionVersion + 1 });
      }
      for (const [id, session] of sessions) {
        if (session.userId === userId && !session.revokedAt) sessions.set(id, { ...session, revokedAt });
      }
    },
    consumeRateLimit: async (input) => consumeRateLimit(rateLimits, input),
    clearRateLimit: async (key) => {
      rateLimits.delete(key);
    }
  };
};
