import {
  AuthEmailVerificationToken,
  AuthPasswordResetToken,
  AuthSession,
  AuthUser,
  AuthUserWithPassword,
  CreateAuthSessionInput,
  CreateAuthUserInput,
  ConsumeRateLimitInput,
  ConsumeRateLimitResult
} from "./types";
import { UserRole } from "./roles";

export type AuthRepository = {
  getUserByEmail: (email: string) => Promise<AuthUserWithPassword | null>;
  getUserById: (id: string) => Promise<AuthUserWithPassword | null>;
  listUsersByRole: (roles: UserRole[]) => Promise<AuthUserWithPassword[]>;
  createEditorUser: (input: CreateAuthUserInput) => Promise<AuthUser | null>;
  createUnverifiedEditorUser?: (input: CreateAuthUserInput) => Promise<AuthUser | null>;
  updatePasswordHash: (userId: string, passwordHash: string) => Promise<void>;
  createPasswordResetToken: (userId: string, tokenHash: string, expiresAt: Date) => Promise<void>;
  getPasswordResetTokenByHash: (tokenHash: string) => Promise<AuthPasswordResetToken | null>;
  deletePasswordResetTokensByUserId: (userId: string) => Promise<void>;
  createEmailVerificationToken?: (userId: string, tokenHash: string, expiresAt: Date) => Promise<void>;
  getEmailVerificationTokenByHash?: (tokenHash: string) => Promise<AuthEmailVerificationToken | null>;
  deleteEmailVerificationTokensByUserId?: (userId: string) => Promise<void>;
  markEmailVerified?: (userId: string) => Promise<void>;
  createSession?: (input: CreateAuthSessionInput) => Promise<void>;
  getSessionById?: (id: string) => Promise<AuthSession | null>;
  getSessionByRefreshTokenHash?: (refreshTokenHash: string) => Promise<AuthSession | null>;
  rotateSession?: (currentSessionId: string, nextSession: CreateAuthSessionInput) => Promise<void>;
  revokeSessionFamily?: (familyId: string) => Promise<void>;
  invalidateUserSessions?: (userId: string) => Promise<void>;
  consumeRateLimit?: (input: ConsumeRateLimitInput) => Promise<ConsumeRateLimitResult>;
  clearRateLimit?: (key: string) => Promise<void>;
};
