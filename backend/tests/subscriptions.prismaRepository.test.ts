jest.mock("@prisma/client", () => {
  const categoryUnsubscriptionFindMany = jest.fn();
  const categoryUnsubscriptionDeleteMany = jest.fn();
  const categoryUnsubscriptionUpsert = jest.fn();

  return {
    PrismaClient: jest.fn(() => ({
      categoryUnsubscription: {
        findMany: categoryUnsubscriptionFindMany,
        deleteMany: categoryUnsubscriptionDeleteMany,
        upsert: categoryUnsubscriptionUpsert
      }
    })),
    __mocks: {
      categoryUnsubscriptionFindMany,
      categoryUnsubscriptionDeleteMany,
      categoryUnsubscriptionUpsert
    }
  };
});

import { createPrismaCategorySubscriptionRepository } from "../src/subscriptions/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  categoryUnsubscriptionFindMany: jest.Mock;
  categoryUnsubscriptionDeleteMany: jest.Mock;
  categoryUnsubscriptionUpsert: jest.Mock;
};

describe("createPrismaCategorySubscriptionRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists unsubscribed category ids", async () => {
    prismaMocks.categoryUnsubscriptionFindMany.mockResolvedValue([
      { id: "1", userId: "user-1", categoryId: "music" },
      { id: "2", userId: "user-1", categoryId: "theatre" }
    ]);
    const repo = createPrismaCategorySubscriptionRepository();

    const result = await repo.listUnsubscribedCategoryIds("user-1");

    expect(result).toEqual(["music", "theatre"]);
    expect(prismaMocks.categoryUnsubscriptionFindMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("removes the unsubscription row when resubscribing", async () => {
    const repo = createPrismaCategorySubscriptionRepository();

    await repo.setSubscription("user-1", "music", true);

    expect(prismaMocks.categoryUnsubscriptionDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", categoryId: "music" }
    });
    expect(prismaMocks.categoryUnsubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("upserts an unsubscription row when unsubscribing", async () => {
    const repo = createPrismaCategorySubscriptionRepository();

    await repo.setSubscription("user-1", "music", false);

    expect(prismaMocks.categoryUnsubscriptionUpsert).toHaveBeenCalledWith({
      where: { userId_categoryId: { userId: "user-1", categoryId: "music" } },
      create: { userId: "user-1", categoryId: "music" },
      update: {}
    });
    expect(prismaMocks.categoryUnsubscriptionDeleteMany).not.toHaveBeenCalled();
  });
});
