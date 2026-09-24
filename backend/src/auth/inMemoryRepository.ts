import { randomUUID } from "node:crypto";
import { AuthRepository } from "./repository";
import { UserRole } from "./roles";
import { AuthPasswordResetToken, AuthSession } from "./types";

export const createInMemoryAuthRepository = (): AuthRepository => {
  const users = new Map<string, {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
    sessionVersion: number;
  }>();
  const passwordResetTokens = new Map<string, AuthPasswordResetToken & { tokenHash: string }>();
  const sessions = new Map<string, AuthSession>();

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
        sessionVersion: 0
      };

      users.set(email, user);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
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
    }
  };
};
