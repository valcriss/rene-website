import { buildAuthHeaders, handleSessionExpired } from "./authHeaders";

export type CategorySubscription = {
  id: string;
  name: string;
  subscribed: boolean;
};

const jsonHeaders = (role: string) => buildAuthHeaders(role);

export const fetchCategorySubscriptions = async (role: string): Promise<CategorySubscription[]> => {
  const response = await fetch("/api/subscriptions/categories", { headers: jsonHeaders(role) });
  if (!response.ok) {
    if (response.status === 401) {
      return handleSessionExpired();
    }
    throw new Error("Impossible de charger les abonnements aux notifications");
  }
  return response.json() as Promise<CategorySubscription[]>;
};

export const updateCategorySubscription = async (
  role: string,
  categoryId: string,
  subscribed: boolean
): Promise<void> => {
  const response = await fetch(`/api/subscriptions/categories/${categoryId}`, {
    method: "PUT",
    headers: jsonHeaders(role),
    body: JSON.stringify({ subscribed })
  });
  if (!response.ok) {
    if (response.status === 401) {
      return handleSessionExpired();
    }
    throw new Error("Impossible de mettre à jour l'abonnement");
  }
};
