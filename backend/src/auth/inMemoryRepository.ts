import { AuthRepository } from "./repository";

export const createInMemoryAuthRepository = (): AuthRepository => ({
  getUserByEmail: async () => null,
  getUserById: async () => null,
  listUsersByRole: async () => []
});
