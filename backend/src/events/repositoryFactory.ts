import { EventRepository } from "./repository";
import { createInMemoryEventRepository } from "./inMemoryRepository";
import { createPrismaEventRepository } from "./prismaRepository";

export const createEventRepository = (): EventRepository => {
  if (process.env.NODE_ENV === "test") {
    return createInMemoryEventRepository();
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    // eslint-disable-next-line no-console
    console.info("DATABASE_URL is set, using Prisma event repository");
    return createPrismaEventRepository();
  }
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn("DATABASE_URL is not set, using in-memory event repository");
  }
  return createInMemoryEventRepository();
};
