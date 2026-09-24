import { createModerationReminderRepository } from "../src/moderationReminders/repositoryFactory";

const inMemoryMock = jest.fn(() => ({
  hasBeenSent: jest.fn(async () => false),
  markSent: jest.fn(async () => undefined)
}));
const prismaMock = jest.fn(() => inMemoryMock());

jest.mock("../src/moderationReminders/inMemoryRepository", () => ({
  createInMemoryModerationReminderRepository: () => inMemoryMock()
}));

jest.mock("../src/moderationReminders/prismaRepository", () => ({
  createPrismaModerationReminderRepository: () => prismaMock()
}));

describe("createModerationReminderRepository", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
    process.env.NODE_ENV = originalEnv;
    inMemoryMock.mockClear();
    prismaMock.mockClear();
  });

  it("uses in-memory repository when DATABASE_URL is not set", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "";
    const repo = createModerationReminderRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses in-memory repository in test env", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createModerationReminderRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses prisma repository when DATABASE_URL is set", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createModerationReminderRepository();
    expect(repo).toBeDefined();
    expect(prismaMock).toHaveBeenCalled();
  });
});
