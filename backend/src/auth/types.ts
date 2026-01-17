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
