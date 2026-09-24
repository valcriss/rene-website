import { createInMemoryCommuneRepository } from "../src/communes/inMemoryRepository";

describe("createInMemoryCommuneRepository", () => {
  it("starts empty", async () => {
    const repo = createInMemoryCommuneRepository();
    await expect(repo.count()).resolves.toBe(0);
  });

  it("bulk inserts communes and counts them", async () => {
    const repo = createInMemoryCommuneRepository();

    await repo.bulkInsert([
      { codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" },
      { codeInsee: "37273", codePostal: "37160", nomCommune: "La Celle-Guenand", libelleAcheminement: "LA CELLE GUENAND" }
    ]);

    await expect(repo.count()).resolves.toBe(2);
  });

  it("finds communes by postal code sorted by name", async () => {
    const repo = createInMemoryCommuneRepository();
    await repo.bulkInsert([
      { codeInsee: "37273", codePostal: "37160", nomCommune: "La Celle-Guenand", libelleAcheminement: "LA CELLE GUENAND" },
      { codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" },
      { codeInsee: "37001", codePostal: "37000", nomCommune: "Tours", libelleAcheminement: "TOURS" }
    ]);

    const results = await repo.findByPostalCode("37160");

    expect(results.map((commune) => commune.nomCommune)).toEqual(["Descartes", "La Celle-Guenand"]);
    expect(results.every((commune) => typeof commune.id === "string" && commune.id.length > 0)).toBe(true);
  });

  it("returns an empty list when no commune matches the postal code", async () => {
    const repo = createInMemoryCommuneRepository();
    await expect(repo.findByPostalCode("99999")).resolves.toEqual([]);
  });

  it("searches communes by name, case-insensitively, sorted and capped", async () => {
    const repo = createInMemoryCommuneRepository();
    await repo.bulkInsert(
      Array.from({ length: 25 }, (_, index) => ({
        codeInsee: `370${index.toString().padStart(2, "0")}`,
        codePostal: "37000",
        nomCommune: `Descartes-Ville-${index.toString().padStart(2, "0")}`,
        libelleAcheminement: `DESCARTES VILLE ${index}`
      }))
    );
    await repo.bulkInsert([{ codeInsee: "37001", codePostal: "37000", nomCommune: "Tours", libelleAcheminement: "TOURS" }]);

    const results = await repo.search("descartes");

    expect(results).toHaveLength(20);
    expect(results.every((commune) => commune.nomCommune.startsWith("Descartes-Ville-"))).toBe(true);
  });
});
