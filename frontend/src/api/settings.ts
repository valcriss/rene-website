export type PublicSettings = {
  homepageIntro: string;
};

export const fetchPublicSettings = async (): Promise<PublicSettings> => {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error("Impossible de charger la configuration du site");
  }
  return response.json();
};
