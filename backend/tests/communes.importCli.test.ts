jest.mock("../src/prisma/client", () => ({
  prisma: { $disconnect: jest.fn(async () => undefined) }
}));

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/prisma/client";
import { resolveCommunesCsvPath, runCommunesImportCli } from "../src/communes/importCli";
import { CommuneRepository } from "../src/communes/repository";

const disconnectMock = prisma.$disconnect as jest.Mock;

const buildRepo = (overrides: Partial<CommuneRepository> = {}): CommuneRepository => ({
  count: jest.fn(async () => 0),
  bulkInsert: jest.fn(async () => undefined),
  findByPostalCode: jest.fn(async () => []),
  search: jest.fn(async () => []),
  ...overrides
});

describe("runCommunesImportCli", () => {
  afterEach(() => {
    disconnectMock.mockClear();
    delete process.env.COMMUNES_CSV_PATH;
  });

  it("creates the repository, imports the csv content and disconnects prisma", async () => {
    const repo = buildRepo();
    const createRepository = jest.fn(() => repo);
    const readCsv = jest.fn(() => "header\n37160;37069;Descartes;DESCARTES");
    const logger = { info: jest.fn() };

    const result = await runCommunesImportCli({ createRepository, readCsv, logger });

    expect(createRepository).toHaveBeenCalled();
    expect(readCsv).toHaveBeenCalled();
    expect(result).toEqual({ imported: 1, skipped: false });
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("disconnects prisma even when the import fails", async () => {
    const createRepository = jest.fn((): CommuneRepository => {
      throw new Error("boom");
    });

    await expect(runCommunesImportCli({ createRepository })).rejects.toThrow("boom");
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("uses default dependencies (repository factory, file reader, console logger)", async () => {
    process.env.COMMUNES_CSV_PATH = "/tmp/communes-test.csv";
    const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue("header\n37160;37069;Descartes;DESCARTES");

    const result = await runCommunesImportCli();

    expect(readFileSyncSpy).toHaveBeenCalledWith("/tmp/communes-test.csv", "utf-8");
    expect(result).toEqual({ imported: 1, skipped: false });

    readFileSyncSpy.mockRestore();
  });
});

describe("resolveCommunesCsvPath", () => {
  afterEach(() => {
    delete process.env.COMMUNES_CSV_PATH;
  });

  it("uses COMMUNES_CSV_PATH when set", () => {
    process.env.COMMUNES_CSV_PATH = "/custom/path/communes.csv";
    expect(resolveCommunesCsvPath()).toBe("/custom/path/communes.csv");
  });

  it("falls back to the repository root communes.csv", () => {
    delete process.env.COMMUNES_CSV_PATH;
    expect(resolveCommunesCsvPath()).toBe(path.resolve(process.cwd(), "..", "communes.csv"));
  });
});
