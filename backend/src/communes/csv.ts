import { CommuneInput } from "./types";

const DELIMITER = ";";

export const parseCommunesCsv = (content: string): CommuneInput[] => {
  const [, ...rows] = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  return rows.reduce<CommuneInput[]>((communes, line) => {
    const [codePostal, codeInsee, nomCommune, libelleAcheminement] = line
      .split(DELIMITER)
      .map((value) => value.trim());

    if (!codePostal || !codeInsee || !nomCommune || !libelleAcheminement) {
      return communes;
    }

    communes.push({ codePostal, codeInsee, nomCommune, libelleAcheminement });
    return communes;
  }, []);
};
