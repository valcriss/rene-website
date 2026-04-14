export type Audience = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export const fetchAudiences = async (): Promise<Audience[]> => {
  const response = await fetch("/api/audiences");
  if (!response.ok) {
    throw new Error("Impossible de charger les publics concernés");
  }
  return response.json();
};