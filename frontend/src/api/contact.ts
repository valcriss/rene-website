export type ContactMessagePayload = {
  name: string;
  email: string;
  message: string;
  website?: string;
};

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

export const sendContactMessage = async (payload: ContactMessagePayload): Promise<void> => {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Envoi du message impossible"));
  }
};
