import { createRequire } from "node:module";
import { CategorySubscriptionRepository } from "./repository";
import { createInMemoryCategorySubscriptionRepository } from "./inMemoryRepository";

const moduleRequire = createRequire(__filename);

export const createCategorySubscriptionRepository = (): CategorySubscriptionRepository => {
  if (process.env.NODE_ENV === "test") {
    return createInMemoryCategorySubscriptionRepository();
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    const { createPrismaCategorySubscriptionRepository } = moduleRequire("./prismaRepository") as typeof import("./prismaRepository");
    // eslint-disable-next-line no-console
    console.info("DATABASE_URL is set, using Prisma category subscription repository");
    return createPrismaCategorySubscriptionRepository();
  }
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set, using in-memory category subscription repository");
  return createInMemoryCategorySubscriptionRepository();
};
