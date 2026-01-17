import { createEventRepository } from "../src/events/repositoryFactory";

const inMemoryMock = jest.fn(() => ({
  list: jest.fn(async () => []),
  getById: jest.fn(async () => null),
  create: jest.fn(async () => ({
    id: "id",
    title: "",
    content: "",
    image: "",
    categoryId: "",
    eventStartAt: "",
    eventEndAt: "",
    allDay: false,
    venueName: "",
    address: "",
    postalCode: "",
    city: "",
    latitude: 0,
    longitude: 0,
    organizerName: "",
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: "",
    rejectionReason: null,
    createdAt: "",
    updatedAt: ""
  })),
  delete: jest.fn(async () => true)
}));
const prismaMock = jest.fn(() => ({
  list: jest.fn(async () => []),
  getById: jest.fn(async () => null),
  create: jest.fn(async () => ({
    id: "id",
    title: "",
    content: "",
    image: "",
    categoryId: "",
    eventStartAt: "",
    eventEndAt: "",
    allDay: false,
    venueName: "",
    address: "",
    postalCode: "",
    city: "",
    latitude: 0,
    longitude: 0,
    organizerName: "",
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: "",
    rejectionReason: null,
    createdAt: "",
    updatedAt: ""
  })),
  delete: jest.fn(async () => true)
}));

jest.mock("../src/events/inMemoryRepository", () => ({
  createInMemoryEventRepository: () => inMemoryMock()
}));

jest.mock("../src/events/prismaRepository", () => ({
  createPrismaEventRepository: () => prismaMock()
}));

describe("createEventRepository", () => {
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
    const repo = createEventRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses in-memory repository in test env", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createEventRepository();
    expect(repo).toBeDefined();
    expect(inMemoryMock).toHaveBeenCalled();
    expect(prismaMock).not.toHaveBeenCalled();
  });

  it("uses prisma repository when DATABASE_URL is set", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    const repo = createEventRepository();
    expect(repo).toBeDefined();
    expect(prismaMock).toHaveBeenCalled();
  });
});
