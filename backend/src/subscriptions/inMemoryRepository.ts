import { CategorySubscriptionRepository } from "./repository";

export const createInMemoryCategorySubscriptionRepository = (): CategorySubscriptionRepository => {
  const unsubscriptions = new Map<string, Set<string>>();

  return {
    listUnsubscribedCategoryIds: async (userId) => Array.from(unsubscriptions.get(userId) ?? []),
    setSubscription: async (userId, categoryId, subscribed) => {
      const categoryIds = unsubscriptions.get(userId) ?? new Set<string>();
      if (subscribed) {
        categoryIds.delete(categoryId);
      } else {
        categoryIds.add(categoryId);
      }
      unsubscriptions.set(userId, categoryIds);
    }
  };
};
