import { randomUUID } from "node:crypto";
import { AuthRepository } from "./repository";
import { UserRole } from "./roles";
import { AuthPasswordResetToken } from "./types";

export const createInMemoryAuthRepository = (): AuthRepository => {
  const users = new Map<string, {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
  }>();
  const passwordResetTokens = new Map<string, AuthPasswordResetToken & { tokenHash: string }>();

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
        passwordHash
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
    }
  };
};
