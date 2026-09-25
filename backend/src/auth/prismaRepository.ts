import { prisma } from "../prisma/client";
import { UserRole } from "./roles";
import { AccountStatus } from "./types";
import { AuthRepository } from "./repository";
import {
  AuthSession,
  AuthUser,
  AuthUserWithPassword,
  ConsumeRateLimitInput,
  ConsumeRateLimitResult
} from "./types";

type PrismaUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  sessionVersion: number;
  emailVerifiedAt?: Date | null;
  accountStatus?: AccountStatus;
};

type PrismaPasswordResetToken = {
  id: string;
  userId: string;
  expiresAt: Date;
};

type PrismaEmailVerificationToken = {
  id: string;
  userId: string;
  expiresAt: Date;
};

type PrismaRateLimit = {
  key: string;
  attempts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

type RateLimitStore = {
  findUnique(args: unknown): Promise<PrismaRateLimit | null>;
  create(args: unknown): Promise<PrismaRateLimit>;
  update(args: unknown): Promise<PrismaRateLimit>;
  delete(args: unknown): Promise<unknown>;
};

type RateLimitTransaction = {
  authRateLimit: RateLimitStore;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
};

const consumePersistentRateLimit = async (
  input: ConsumeRateLimitInput
): Promise<ConsumeRateLimitResult> => {
  // Calling prisma.$transaction directly (rather than extracting it into a standalone
  // reference first) matters: detaching it from `prisma` loses the `this` binding its
  // implementation relies on internally, which surfaces as a `_engineConfig` TypeError.
  return prisma.$transaction(async (prismaTx) => {
    const tx = prismaTx as unknown as RateLimitTransaction;
    // PostgreSQL advisory locks make the read/modify/write sequence atomic across API replicas.
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", input.key);
    const current = await tx.authRateLimit.findUnique({ where: { key: input.key } });

    if (current?.blockedUntil && current.blockedUntil > input.now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil.getTime() - input.now.getTime()) / 1000))
      };
    }

    const isNewWindow = !current || input.now.getTime() - current.windowStartedAt.getTime() >= input.limit.windowMs;
    const attempts = isNewWindow ? 1 : current.attempts + 1;
    const blockedUntil = attempts > input.limit.max
      ? new Date(input.now.getTime() + Math.min(15 * 60, 5 * 2 ** (attempts - input.limit.max - 1)) * 1000)
      : null;
    const data = {
      attempts,
      windowStartedAt: isNewWindow ? input.now : current.windowStartedAt,
      blockedUntil
    };

    if (current) {
      await tx.authRateLimit.update({ where: { key: input.key }, data });
    } else {
      await tx.authRateLimit.create({ data: { key: input.key, ...data } });
    }

    return blockedUntil
      ? { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil.getTime() - input.now.getTime()) / 1000) }
      : { allowed: true, retryAfterSeconds: 0 };
  });
};

const toAuthUserWithPassword = (user: PrismaUser): AuthUserWithPassword => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  passwordHash: user.passwordHash,
  ...(user.sessionVersion === undefined ? {} : { sessionVersion: user.sessionVersion }),
  ...(user.emailVerifiedAt === undefined ? {} : { emailVerifiedAt: user.emailVerifiedAt }),
  accountStatus: user.accountStatus ?? "ACTIVE"
});

const toAuthUser = (user: PrismaUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  ...(user.sessionVersion === undefined ? {} : { sessionVersion: user.sessionVersion }),
  ...(user.emailVerifiedAt === undefined ? {} : { emailVerifiedAt: user.emailVerifiedAt }),
  accountStatus: user.accountStatus ?? "ACTIVE"
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
  createUnverifiedEditorUser: async ({ name, email, passwordHash }) => {
    try {
      const user = await prisma.user.create({
        data: { name, email, role: "EDITOR", passwordHash, emailVerifiedAt: null, accountStatus: "INVITED" }
      });
      return toAuthUser(user as PrismaUser);
    } catch (error) {
      if (isUniqueConstraintError(error)) return null;
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
  },
  createEmailVerificationToken: async (userId, tokenHash, expiresAt) => {
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });
  },
  getEmailVerificationTokenByHash: async (tokenHash) =>
    prisma.emailVerificationToken
      .findUnique({ where: { tokenHash } })
      .then((token: PrismaEmailVerificationToken | null) =>
        token ? { id: token.id, userId: token.userId, expiresAt: token.expiresAt } : null
      ),
  deleteEmailVerificationTokensByUserId: async (userId) => {
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  },
  markEmailVerified: async (userId) => {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date(), accountStatus: "ACTIVE" } });
  },
  createSession: async (input) => {
    await prisma.authSession.create({ data: input });
  },
  getSessionById: async (id) =>
    prisma.authSession.findUnique({ where: { id } }) as Promise<AuthSession | null>,
  getSessionByRefreshTokenHash: async (refreshTokenHash) =>
    prisma.authSession.findUnique({ where: { refreshTokenHash } }) as Promise<AuthSession | null>,
  rotateSession: async (currentSessionId, nextSession) => {
    await prisma.$transaction([
      prisma.authSession.update({ where: { id: currentSessionId }, data: { revokedAt: new Date() } }),
      prisma.authSession.create({ data: nextSession })
    ]);
  },
  revokeSessionFamily: async (familyId) => {
    await prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  },
  invalidateUserSessions: async (userId) => {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }),
      prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);
  },
  consumeRateLimit: consumePersistentRateLimit,
  clearRateLimit: async (key) => {
    try {
      await prisma.authRateLimit.delete({ where: { key } });
    } catch {
      // The limiter state may already have expired or been removed by another replica.
    }
  }
});
