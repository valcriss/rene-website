import { AuthUser, AuthUserWithPassword, CreateAuthUserInput } from "./types";
import { UserRole } from "./roles";

export type AuthRepository = {
  getUserByEmail: (email: string) => Promise<AuthUserWithPassword | null>;
  getUserById: (id: string) => Promise<AuthUserWithPassword | null>;
  listUsersByRole: (roles: UserRole[]) => Promise<AuthUserWithPassword[]>;
  createEditorUser: (input: CreateAuthUserInput) => Promise<AuthUser | null>;
  updatePasswordHash: (userId: string, passwordHash: string) => Promise<void>;
};
