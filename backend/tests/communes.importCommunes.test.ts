import { CommuneRepository } from "../src/communes/repository";
import { importCommunesFromCsv } from "../src/communes/importCommunes";

const buildRepo = (overrides: Partial<CommuneRepository> = {}): CommuneRepository => ({
  count: jest.fn(async () => 0),
  bulkInsert: jest.fn(async () => undefined),
  findByPostalCode: jest.fn(async () => []),
  search: jest.fn(async () => []),
  ...overrides
});

const csvContent = ["header", "37160;37069;Descartes;DESCARTES"].join("\n");

describe("importCommunesFromCsv", () => {
  it("imports the CSV content when the referential is empty", async () => {
    const bulkInsert = jest.fn(async () => undefined);
    const repo = buildRepo({ bulkInsert });
    const logger = { info: jest.fn() };

    const result = await importCommunesFromCsv(repo, csvContent, logger);

    expect(bulkInsert).toHaveBeenCalledWith([
      { codePostal: "37160", codeInsee: "37069", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" }
    ]);
    expect(result).toEqual({ imported: 1, skipped: false });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("importé"));
  });

  it("skips the import when the referential is already populated", async () => {
    const bulkInsert = jest.fn(async () => undefined);
    const repo = buildRepo({ count: jest.fn(async () => 5), bulkInsert });
    const logger = { info: jest.fn() };

    const result = await importCommunesFromCsv(repo, csvContent, logger);

    expect(bulkInsert).not.toHaveBeenCalled();
    expect(result).toEqual({ imported: 0, skipped: true });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("ignoré"));
  });

  it("defaults to the console logger", async () => {
    const repo = buildRepo();
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);

    await importCommunesFromCsv(repo, csvContent);

    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
