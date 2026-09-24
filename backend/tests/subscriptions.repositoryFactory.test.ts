import { createCategorySubscriptionRepository } from "../src/subscriptions/repositoryFactory";

const inMemoryMock = jest.fn(() => ({
  listUnsubscribedCategoryIds: jest.fn(async () => []),
  setSubscription: jest.fn(async () => undefined)
}));
const prismaMock = jest.fn(() => inMemoryMock());

jest.mock("../src/subscriptions/inMemoryRepository", () => ({
  createInMemoryCategorySubscriptionRepository: () => inMemoryMock()
}));

jest.mock("../src/subscriptions/prismaRepository", () => ({
  createPrismaCategorySubscriptionRepository: () => prismaMock()
}));

describe("createCategorySubscriptionRepository", () => {
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
    const repo = createCategorySubscriptionRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses in-memory repository in test env", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createCategorySubscriptionRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses prisma repository when DATABASE_URL is set", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createCategorySubscriptionRepository();
    expect(repo).toBeDefined();
    expect(prismaMock).toHaveBeenCalled();
  });
});
