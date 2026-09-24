export interface CategorySubscriptionRepository {
  listUnsubscribedCategoryIds(userId: string): Promise<string[]>;
  setSubscription(userId: string, categoryId: string, subscribed: boolean): Promise<void>;
}
