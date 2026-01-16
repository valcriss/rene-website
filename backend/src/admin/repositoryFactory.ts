import { AdminRepository } from "./repository";
import { createInMemoryAdminRepository } from "./inMemoryRepository";
import { createPrismaAdminRepository } from "./prismaRepository";

export const createAdminRepository = (): AdminRepository => {
  if (process.env.NODE_ENV === "test") {
    return createInMemoryAdminRepository();
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    // eslint-disable-next-line no-console
    console.info("DATABASE_URL is set, using Prisma admin repository (categories)");
    return createPrismaAdminRepository();
  }
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn("DATABASE_URL is not set, using in-memory admin repository");
  }
  return createInMemoryAdminRepository();
};
