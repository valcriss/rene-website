import { AdminRepository } from "../admin/repository";
import { listAdminCategories } from "../admin/service";
import { CategorySubscriptionRepository } from "./repository";

export type CategorySubscriptionView = {
  id: string;
  name: string;
  subscribed: boolean;
};

type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export const listCategorySubscriptions = async (
  subscriptionRepo: CategorySubscriptionRepository,
  adminRepo: AdminRepository,
  userId: string
): Promise<CategorySubscriptionView[]> => {
  const [categories, unsubscribedIds] = await Promise.all([
    listAdminCategories(adminRepo),
    subscriptionRepo.listUnsubscribedCategoryIds(userId)
  ]);

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    subscribed: !unsubscribedIds.includes(category.id)
  }));
};

export const setCategorySubscription = async (
  subscriptionRepo: CategorySubscriptionRepository,
  userId: string,
  categoryId: string,
  subscribed: unknown
): Promise<ServiceResult<null>> => {
  if (typeof subscribed !== "boolean") {
    return { ok: false, errors: ["subscribed doit être un booléen."] };
  }

  await subscriptionRepo.setSubscription(userId, categoryId, subscribed);
  return { ok: true, value: null };
};
