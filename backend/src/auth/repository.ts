import { AuthUserWithPassword } from "./types";
import { UserRole } from "./roles";

export type AuthRepository = {
  getUserByEmail: (email: string) => Promise<AuthUserWithPassword | null>;
  getUserById: (id: string) => Promise<AuthUserWithPassword | null>;
  listUsersByRole: (roles: UserRole[]) => Promise<AuthUserWithPassword[]>;
};
