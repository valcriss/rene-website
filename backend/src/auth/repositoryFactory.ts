import { createRequire } from "node:module";
import { createInMemoryAuthRepository } from "./inMemoryRepository";
import { AuthRepository } from "./repository";

const moduleRequire = createRequire(__filename);

export const createAuthRepository = (): AuthRepository => {
	if (process.env.NODE_ENV === "test") {
		return createInMemoryAuthRepository();
	}

	if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
		const { createPrismaAuthRepository } = moduleRequire("./prismaRepository") as typeof import("./prismaRepository");
		return createPrismaAuthRepository();
	}

	if (process.env.NODE_ENV !== "test") {
		// eslint-disable-next-line no-console
		console.warn("DATABASE_URL is not set, using in-memory auth repository");
	}

	return createInMemoryAuthRepository();
};
