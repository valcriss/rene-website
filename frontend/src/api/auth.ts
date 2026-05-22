export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "EDITOR" | "MODERATOR" | "ADMIN";
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
  passwordConfirmation: string;
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

const postAuthRequest = async (path: string, body: Record<string, string>, fallback: string): Promise<AuthResponse> => {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, fallback));
  }

  return response.json() as Promise<AuthResponse>;
};

const postVoidRequest = async (path: string, body: Record<string, string>, fallback: string): Promise<void> => {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, fallback));
  }
};

export const login = async (email: string, password: string): Promise<AuthResponse> =>
  postAuthRequest("/api/auth/login", { email, password }, "Connexion impossible");

export const signup = async (payload: SignupPayload): Promise<AuthResponse> =>
  postAuthRequest("/api/auth/signup", payload, "Inscription impossible");

export const requestPasswordReset = async (email: string): Promise<void> =>
  postVoidRequest("/api/auth/forgot-password", { email }, "Demande de réinitialisation impossible");

export const resetPassword = async (payload: ResetPasswordPayload): Promise<void> =>
  postVoidRequest("/api/auth/reset-password", payload, "Réinitialisation impossible");
