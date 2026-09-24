jest.mock("@prisma/client", () => {
  const communeCount = jest.fn();
  const communeCreateMany = jest.fn();
  const communeFindMany = jest.fn();

  return {
    PrismaClient: jest.fn(() => ({
      commune: {
        count: communeCount,
        createMany: communeCreateMany,
        findMany: communeFindMany
      }
    })),
    __mocks: {
      communeCount,
      communeCreateMany,
      communeFindMany
    }
  };
});

import { createPrismaCommuneRepository } from "../src/communes/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  communeCount: jest.Mock;
  communeCreateMany: jest.Mock;
  communeFindMany: jest.Mock;
};

describe("createPrismaCommuneRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts communes", async () => {
    prismaMocks.communeCount.mockResolvedValue(42);
    const repo = createPrismaCommuneRepository();

    await expect(repo.count()).resolves.toBe(42);
  });

  it("does not call createMany when there is nothing to insert", async () => {
    const repo = createPrismaCommuneRepository();

    await repo.bulkInsert([]);

    expect(prismaMocks.communeCreateMany).not.toHaveBeenCalled();
  });

  it("bulk inserts communes skipping duplicates", async () => {
    const repo = createPrismaCommuneRepository();
    const communes = [{ codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" }];

    await repo.bulkInsert(communes);

    expect(prismaMocks.communeCreateMany).toHaveBeenCalledWith({ data: communes, skipDuplicates: true });
  });

  it("finds communes by postal code ordered by name", async () => {
    prismaMocks.communeFindMany.mockResolvedValue([]);
    const repo = createPrismaCommuneRepository();

    await repo.findByPostalCode("37160");

    expect(prismaMocks.communeFindMany).toHaveBeenCalledWith({
      where: { codePostal: "37160" },
      orderBy: { nomCommune: "asc" }
    });
  });

  it("searches communes by name, case-insensitively and capped", async () => {
    prismaMocks.communeFindMany.mockResolvedValue([]);
    const repo = createPrismaCommuneRepository();

    await repo.search("descartes");

    expect(prismaMocks.communeFindMany).toHaveBeenCalledWith({
      where: { nomCommune: { contains: "descartes", mode: "insensitive" } },
      orderBy: { nomCommune: "asc" },
      take: 20
    });
  });
});
