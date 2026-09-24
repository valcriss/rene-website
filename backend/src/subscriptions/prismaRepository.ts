import { prisma } from "../prisma/client";
import { CategorySubscriptionRepository } from "./repository";

type PrismaCategoryUnsubscription = {
  id: string;
  userId: string;
  categoryId: string;
};

export const createPrismaCategorySubscriptionRepository = (): CategorySubscriptionRepository => ({
  listUnsubscribedCategoryIds: async (userId) =>
    prisma.categoryUnsubscription
      .findMany({ where: { userId } })
      .then((rows: PrismaCategoryUnsubscription[]) => rows.map((row) => row.categoryId)),
  setSubscription: async (userId, categoryId, subscribed) => {
    if (subscribed) {
      await prisma.categoryUnsubscription.deleteMany({ where: { userId, categoryId } });
      return;
    }

    await prisma.categoryUnsubscription.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      create: { userId, categoryId },
      update: {}
    });
  }
});
