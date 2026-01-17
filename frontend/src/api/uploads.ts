const parseApiError = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { errors?: string[]; message?: string };
    if (data.errors && data.errors.length > 0) {
      return data.errors.join(" · ");
    }
    if (data.message) {
      return data.message;
    }
  } catch {
    // ignore parsing errors
  }
  return fallback;
};

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Impossible d'uploader l'image"));
  }
  const data = (await response.json()) as { url: string };
  return data.url;
};
