import { prisma } from "../prisma/client";
import { UserRole } from "./roles";
import { AuthRepository } from "./repository";

type PrismaUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
};

export const createPrismaAuthRepository = (): AuthRepository => ({
  getUserByEmail: async (email) =>
    prisma.user.findUnique({ where: { email } }).then((user: PrismaUser | null) =>
      user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            passwordHash: user.passwordHash
          }
        : null
    ),
  getUserById: async (id) =>
    prisma.user.findUnique({ where: { id } }).then((user: PrismaUser | null) =>
      user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            passwordHash: user.passwordHash
          }
        : null
    ),
  listUsersByRole: async (roles) =>
    prisma.user
      .findMany({ where: { role: { in: roles } } })
      .then((users: PrismaUser[]) =>
        users.map((user: PrismaUser) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash: user.passwordHash
        }))
      )
});
