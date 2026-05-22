import { prisma } from "../prisma/client";
import { UserRole } from "./roles";
import { AuthRepository } from "./repository";
import { AuthUser, AuthUserWithPassword } from "./types";

type PrismaUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
};

type PrismaPasswordResetToken = {
  id: string;
  userId: string;
  expiresAt: Date;
};

const toAuthUserWithPassword = (user: PrismaUser): AuthUserWithPassword => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  passwordHash: user.passwordHash
});

const toAuthUser = (user: PrismaUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

export const createPrismaAuthRepository = (): AuthRepository => ({
  getUserByEmail: async (email) =>
    prisma.user.findUnique({ where: { email } }).then((user: PrismaUser | null) => (user ? toAuthUserWithPassword(user) : null)),
  getUserById: async (id) =>
    prisma.user.findUnique({ where: { id } }).then((user: PrismaUser | null) => (user ? toAuthUserWithPassword(user) : null)),
  listUsersByRole: async (roles) =>
    prisma.user
      .findMany({ where: { role: { in: roles } } })
      .then((users: PrismaUser[]) => users.map((user: PrismaUser) => toAuthUserWithPassword(user))),
  createEditorUser: async ({ name, email, passwordHash }) => {
    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: "EDITOR",
          passwordHash
        }
      });

      return toAuthUser(user as PrismaUser);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return null;
      }

      throw error;
    }
  },
  updatePasswordHash: async (userId, passwordHash) => {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  },
  createPasswordResetToken: async (userId, tokenHash, expiresAt) => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });
  },
  getPasswordResetTokenByHash: async (tokenHash) =>
    prisma.passwordResetToken
      .findUnique({ where: { tokenHash } })
      .then((token: PrismaPasswordResetToken | null) =>
        token
          ? {
              id: token.id,
              userId: token.userId,
              expiresAt: token.expiresAt
            }
          : null
      ),
  deletePasswordResetTokensByUserId: async (userId) => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
  }
});
