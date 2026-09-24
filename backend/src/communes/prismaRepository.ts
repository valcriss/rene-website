import { prisma } from "../prisma/client";
import { CommuneRepository } from "./repository";

const SEARCH_RESULTS_LIMIT = 20;

export const createPrismaCommuneRepository = (): CommuneRepository => ({
  count: () => prisma.commune.count(),
  bulkInsert: async (communes) => {
    if (communes.length === 0) {
      return;
    }
    await prisma.commune.createMany({ data: communes, skipDuplicates: true });
  },
  findByPostalCode: (postalCode) =>
    prisma.commune.findMany({
      where: { codePostal: postalCode },
      orderBy: { nomCommune: "asc" }
    }),
  search: (query) =>
    prisma.commune.findMany({
      where: { nomCommune: { contains: query, mode: "insensitive" } },
      orderBy: { nomCommune: "asc" },
      take: SEARCH_RESULTS_LIMIT
    })
});
