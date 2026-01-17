import { prisma } from "../prisma/client";
import { AuthRepository } from "./repository";

export const createPrismaAuthRepository = (): AuthRepository => ({
  getUserByEmail: async (email) =>
    prisma.user.findUnique({ where: { email } }).then((user) =>
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
    prisma.user.findUnique({ where: { id } }).then((user) =>
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
      .then((users) =>
        users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash: user.passwordHash
        }))
      )
});
