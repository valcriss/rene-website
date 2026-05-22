import { UserRole } from "./roles";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

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
