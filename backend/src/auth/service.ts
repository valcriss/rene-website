import { AuthRepository } from "./repository";
import { verifyPassword } from "./password";
import { signUserToken } from "./jwt";
import { AuthUser } from "./types";

export type LoginResult =
  | { ok: true; value: { token: string; user: AuthUser } }
  | { ok: false; errors: string[] };

export const login = async (repo: AuthRepository, input: unknown): Promise<LoginResult> => {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["Le corps de la requête doit être un objet."] };
  }

  const data = input as Record<string, unknown>;
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const password = typeof data.password === "string" ? data.password : "";

  const errors: string[] = [];
  if (!email) errors.push("L'email est requis.");
  if (!password) errors.push("Le mot de passe est requis.");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const user = await repo.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, errors: ["Identifiants invalides."] };
  }

  const tokenResult = signUserToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  if (!tokenResult.ok) {
    return { ok: false, errors: tokenResult.errors };
  }

  return {
    ok: true,
    value: {
      token: tokenResult.value,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  };
};
