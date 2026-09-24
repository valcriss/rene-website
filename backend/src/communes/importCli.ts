import fs from "node:fs";
import path from "node:path";
import { prisma } from "../prisma/client";
import { CommuneRepository } from "./repository";
import { createCommuneRepository } from "./repositoryFactory";
import { ImportCommunesResult, ImportLogger, importCommunesFromCsv } from "./importCommunes";

export type RunCommunesImportCliDependencies = {
  createRepository?: () => CommuneRepository;
  readCsv?: () => string;
  logger?: ImportLogger;
};

export const resolveCommunesCsvPath = () =>
  process.env.COMMUNES_CSV_PATH?.trim() || path.resolve(process.cwd(), "..", "communes.csv");

export const runCommunesImportCli = async (
  dependencies?: RunCommunesImportCliDependencies
): Promise<ImportCommunesResult> => {
  const createRepository = dependencies?.createRepository ?? createCommuneRepository;
  const readCsv = dependencies?.readCsv ?? (() => fs.readFileSync(resolveCommunesCsvPath(), "utf-8"));
  const logger = dependencies?.logger ?? console;

  try {
    const repo = createRepository();
    return await importCommunesFromCsv(repo, readCsv(), logger);
  } finally {
    await prisma.$disconnect();
  }
};
