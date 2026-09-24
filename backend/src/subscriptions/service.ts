import { AdminRepository } from "../admin/repository";
import { listAdminCategories } from "../admin/service";
import { CategorySubscriptionRepository } from "./repository";
import { AuthenticatedActor } from "../auth/types";

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
  actor: AuthenticatedActor
): Promise<CategorySubscriptionView[]> => {
  const [categories, unsubscribedIds] = await Promise.all([
    listAdminCategories(adminRepo),
    subscriptionRepo.listUnsubscribedCategoryIds(actor.id)
  ]);

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    subscribed: !unsubscribedIds.includes(category.id)
  }));
};

export const setCategorySubscription = async (
  subscriptionRepo: CategorySubscriptionRepository,
  actor: AuthenticatedActor,
  categoryId: string,
  subscribed: unknown
): Promise<ServiceResult<null>> => {
  if (typeof subscribed !== "boolean") {
    return { ok: false, errors: ["subscribed doit être un booléen."] };
  }

  await subscriptionRepo.setSubscription(actor.id, categoryId, subscribed);
  return { ok: true, value: null };
};
