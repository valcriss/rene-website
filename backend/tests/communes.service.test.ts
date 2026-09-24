import { CommuneRepository } from "../src/communes/repository";
import { searchCommunes } from "../src/communes/service";

const buildRepo = (overrides: Partial<CommuneRepository> = {}): CommuneRepository => ({
  count: jest.fn(async () => 0),
  bulkInsert: jest.fn(async () => undefined),
  findByPostalCode: jest.fn(async () => []),
  search: jest.fn(async () => []),
  ...overrides
});

describe("searchCommunes", () => {
  it("returns an error when neither postal code nor query is provided", async () => {
    const repo = buildRepo();

    const result = await searchCommunes(repo, {});

    expect(result).toEqual({ ok: false, errors: ["Le code postal ou le nom de la commune est requis."] });
  });

  it("returns an error when postal code and query are blank", async () => {
    const repo = buildRepo();

    const result = await searchCommunes(repo, { postalCode: "  ", q: "  " });

    expect(result).toEqual({ ok: false, errors: ["Le code postal ou le nom de la commune est requis."] });
  });

  it("searches by postal code when provided", async () => {
    const commune = { id: "1", codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" };
    const findByPostalCode = jest.fn(async () => [commune]);
    const repo = buildRepo({ findByPostalCode });

    const result = await searchCommunes(repo, { postalCode: " 37160 " });

    expect(findByPostalCode).toHaveBeenCalledWith("37160");
    expect(result).toEqual({ ok: true, value: [commune] });
  });

  it("searches by name when only a query is provided", async () => {
    const commune = { id: "1", codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" };
    const search = jest.fn(async () => [commune]);
    const repo = buildRepo({ search });

    const result = await searchCommunes(repo, { q: " Descartes " });

    expect(search).toHaveBeenCalledWith("Descartes");
    expect(result).toEqual({ ok: true, value: [commune] });
  });

  it("prefers postal code search when both are provided", async () => {
    const findByPostalCode = jest.fn(async () => []);
    const search = jest.fn(async () => []);
    const repo = buildRepo({ findByPostalCode, search });

    await searchCommunes(repo, { postalCode: "37160", q: "Descartes" });

    expect(findByPostalCode).toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });
});
