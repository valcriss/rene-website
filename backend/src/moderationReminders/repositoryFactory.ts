import { createRequire } from "node:module";
import { ModerationReminderRepository } from "./repository";
import { createInMemoryModerationReminderRepository } from "./inMemoryRepository";

const moduleRequire = createRequire(__filename);

export const createModerationReminderRepository = (): ModerationReminderRepository => {
  if (process.env.NODE_ENV === "test") {
    return createInMemoryModerationReminderRepository();
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    const { createPrismaModerationReminderRepository } = moduleRequire("./prismaRepository") as typeof import("./prismaRepository");
    // eslint-disable-next-line no-console
    console.info("DATABASE_URL is set, using Prisma moderation reminder repository");
    return createPrismaModerationReminderRepository();
  }
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn("DATABASE_URL is not set, using in-memory moderation reminder repository");
  }
  return createInMemoryModerationReminderRepository();
};
