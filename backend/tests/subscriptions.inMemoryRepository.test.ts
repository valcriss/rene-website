import { createInMemoryCategorySubscriptionRepository } from "../src/subscriptions/inMemoryRepository";

describe("createInMemoryCategorySubscriptionRepository", () => {
  it("has no unsubscriptions by default", async () => {
    const repo = createInMemoryCategorySubscriptionRepository();

    await expect(repo.listUnsubscribedCategoryIds("user-1")).resolves.toEqual([]);
  });

  it("adds a category to the unsubscribed list", async () => {
    const repo = createInMemoryCategorySubscriptionRepository();

    await repo.setSubscription("user-1", "music", false);

    await expect(repo.listUnsubscribedCategoryIds("user-1")).resolves.toEqual(["music"]);
  });

  it("removes a category from the unsubscribed list when resubscribing", async () => {
    const repo = createInMemoryCategorySubscriptionRepository();

    await repo.setSubscription("user-1", "music", false);
    await repo.setSubscription("user-1", "music", true);

    await expect(repo.listUnsubscribedCategoryIds("user-1")).resolves.toEqual([]);
  });

  it("tracks unsubscriptions independently per user", async () => {
    const repo = createInMemoryCategorySubscriptionRepository();

    await repo.setSubscription("user-1", "music", false);
    await repo.setSubscription("user-2", "theatre", false);

    await expect(repo.listUnsubscribedCategoryIds("user-1")).resolves.toEqual(["music"]);
    await expect(repo.listUnsubscribedCategoryIds("user-2")).resolves.toEqual(["theatre"]);
  });
});
