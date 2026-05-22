import { AuthPasswordResetToken, AuthUser, AuthUserWithPassword, CreateAuthUserInput } from "./types";
import { UserRole } from "./roles";

export type AuthRepository = {
  getUserByEmail: (email: string) => Promise<AuthUserWithPassword | null>;
  getUserById: (id: string) => Promise<AuthUserWithPassword | null>;
  listUsersByRole: (roles: UserRole[]) => Promise<AuthUserWithPassword[]>;
  createEditorUser: (input: CreateAuthUserInput) => Promise<AuthUser | null>;
  updatePasswordHash: (userId: string, passwordHash: string) => Promise<void>;
  createPasswordResetToken: (userId: string, tokenHash: string, expiresAt: Date) => Promise<void>;
  getPasswordResetTokenByHash: (tokenHash: string) => Promise<AuthPasswordResetToken | null>;
  deletePasswordResetTokensByUserId: (userId: string) => Promise<void>;
};
