import { createRequire } from "node:module";
import { CommuneRepository } from "./repository";
import { createInMemoryCommuneRepository } from "./inMemoryRepository";

const moduleRequire = createRequire(__filename);

export const createCommuneRepository = (): CommuneRepository => {
  if (process.env.NODE_ENV === "test") {
    return createInMemoryCommuneRepository();
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    const { createPrismaCommuneRepository } = moduleRequire("./prismaRepository") as typeof import("./prismaRepository");
    // eslint-disable-next-line no-console
    console.info("DATABASE_URL is set, using Prisma commune repository");
    return createPrismaCommuneRepository();
  }
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set, using in-memory commune repository");
  return createInMemoryCommuneRepository();
};
