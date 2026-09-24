import { createCommuneRepository } from "../src/communes/repositoryFactory";

const inMemoryMock = jest.fn(() => ({
  count: jest.fn(async () => 0),
  bulkInsert: jest.fn(async () => undefined),
  findByPostalCode: jest.fn(async () => []),
  search: jest.fn(async () => [])
}));
const prismaMock = jest.fn(() => inMemoryMock());

jest.mock("../src/communes/inMemoryRepository", () => ({
  createInMemoryCommuneRepository: () => inMemoryMock()
}));

jest.mock("../src/communes/prismaRepository", () => ({
  createPrismaCommuneRepository: () => prismaMock()
}));

describe("createCommuneRepository", () => {
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
    const repo = createCommuneRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses in-memory repository in test env", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createCommuneRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses prisma repository when DATABASE_URL is set", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createCommuneRepository();
    expect(repo).toBeDefined();
    expect(prismaMock).toHaveBeenCalled();
  });
});
