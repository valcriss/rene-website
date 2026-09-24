import { CommuneRepository } from "./repository";
import { parseCommunesCsv } from "./csv";

export type ImportLogger = {
  info: (message: string) => void;
};

export type ImportCommunesResult = {
  imported: number;
  skipped: boolean;
};

export const importCommunesFromCsv = async (
  repo: CommuneRepository,
  csvContent: string,
  logger: ImportLogger = console
): Promise<ImportCommunesResult> => {
  const existingCount = await repo.count();
  if (existingCount > 0) {
    logger.info(`Référentiel des communes déjà peuplé (${existingCount} ligne(s)), import ignoré.`);
    return { imported: 0, skipped: true };
  }

  const communes = parseCommunesCsv(csvContent);
  await repo.bulkInsert(communes);
  logger.info(`Référentiel des communes importé (${communes.length} ligne(s)).`);
  return { imported: communes.length, skipped: false };
};
