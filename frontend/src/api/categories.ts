export type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export const fetchCategories = async (): Promise<Category[]> => {
  const response = await fetch("/api/categories");
  if (!response.ok) {
    throw new Error("Impossible de charger les catégories");
  }
  return response.json();
};
