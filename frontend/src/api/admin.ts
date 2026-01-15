export type AdminUserRole = "EDITOR" | "MODERATOR" | "ADMIN";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
};

export type AdminCategory = {
  id: string;
  name: string;
};

export type AdminSettings = {
  contactEmail: string;
  contactPhone: string;
  homepageIntro: string;
};

const jsonHeaders = (role: string) => ({
  "Content-Type": "application/json",
  "x-user-role": role
});

export const fetchAdminUsers = async (role: string): Promise<AdminUser[]> => {
  const response = await fetch("/api/admin/users", { headers: jsonHeaders(role) });
  if (!response.ok) {
    throw new Error("Impossible de charger les utilisateurs");
  }
  return response.json() as Promise<AdminUser[]>;
};

export const createAdminUser = async (role: string, payload: Omit<AdminUser, "id">): Promise<AdminUser> => {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: jsonHeaders(role),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Impossible de créer l'utilisateur");
  }
  return response.json() as Promise<AdminUser>;
};

export const updateAdminUser = async (
  role: string,
  id: string,
  payload: Omit<AdminUser, "id">
): Promise<AdminUser> => {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "PUT",
    headers: jsonHeaders(role),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Impossible de mettre à jour l'utilisateur");
  }
  return response.json() as Promise<AdminUser>;
};

export const deleteAdminUser = async (role: string, id: string): Promise<void> => {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    headers: jsonHeaders(role)
  });
  if (!response.ok) {
    throw new Error("Impossible de supprimer l'utilisateur");
  }
};

export const fetchAdminCategories = async (role: string): Promise<AdminCategory[]> => {
  const response = await fetch("/api/admin/categories", { headers: jsonHeaders(role) });
  if (!response.ok) {
    throw new Error("Impossible de charger les catégories");
  }
  return response.json() as Promise<AdminCategory[]>;
};

export const createAdminCategory = async (
  role: string,
  payload: Omit<AdminCategory, "id">
): Promise<AdminCategory> => {
  const response = await fetch("/api/admin/categories", {
    method: "POST",
    headers: jsonHeaders(role),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Impossible de créer la catégorie");
  }
  return response.json() as Promise<AdminCategory>;
};

export const updateAdminCategory = async (
  role: string,
  id: string,
  payload: Omit<AdminCategory, "id">
): Promise<AdminCategory> => {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: "PUT",
    headers: jsonHeaders(role),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Impossible de mettre à jour la catégorie");
  }
  return response.json() as Promise<AdminCategory>;
};

export const deleteAdminCategory = async (role: string, id: string): Promise<void> => {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: "DELETE",
    headers: jsonHeaders(role)
  });
  if (!response.ok) {
    throw new Error("Impossible de supprimer la catégorie");
  }
};

export const fetchAdminSettings = async (role: string): Promise<AdminSettings> => {
  const response = await fetch("/api/admin/settings", { headers: jsonHeaders(role) });
  if (!response.ok) {
    throw new Error("Impossible de charger les réglages");
  }
  return response.json() as Promise<AdminSettings>;
};

export const updateAdminSettings = async (role: string, payload: AdminSettings): Promise<AdminSettings> => {
  const response = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: jsonHeaders(role),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Impossible de mettre à jour les réglages");
  }
  return response.json() as Promise<AdminSettings>;
};