import { UserRole } from "./roles";

export type AccountStatus = "INVITED" | "ACTIVE" | "SUSPENDED";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sessionVersion?: number;
  emailVerifiedAt?: Date | null;
  accountStatus?: AccountStatus;
  authenticatedAt?: Date;
};

export type AuthenticatedActor = Pick<AuthUser, "id" | "role">;

export type AuthUserWithPassword = AuthUser & {
  passwordHash: string;
};

export type AuthPasswordResetToken = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export type CreateAuthUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  sessionVersion: number;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type CreateAuthSessionInput = Omit<AuthSession, "revokedAt">;

export type AuthEmailVerificationToken = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export type ConsumeRateLimitInput = {
  key: string;
  limit: { max: number; windowMs: number };
  now: Date;
};

export type ConsumeRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};
