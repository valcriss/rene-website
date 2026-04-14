import { AuthRepository } from "./repository";
import { hashPassword, needsPasswordRehash, verifyPassword } from "./password";
import { signUserToken } from "./jwt";
import { AuthUser } from "./types";

export type LoginResult =
  | { ok: true; value: { token: string; user: AuthUser } }
  | { ok: false; errors: string[] };

export type SignupResult =
  | { ok: true; value: { token: string; user: AuthUser } }
  | { ok: false; errors: string[]; code: "validation" | "conflict" };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minPasswordLength = 8;

const createAuthResponse = (user: AuthUser): LoginResult => {
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
      user
    }
  };
};

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
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, errors: ["Identifiants invalides."] };
  }

  if (needsPasswordRehash(user.passwordHash)) {
    try {
      const nextPasswordHash = await hashPassword(password);
      await repo.updatePasswordHash(user.id, nextPasswordHash);
    } catch {
      // Best effort: a successful login should not fail because background rehashing failed.
    }
  }

  return createAuthResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
};

export const signup = async (repo: AuthRepository, input: unknown): Promise<SignupResult> => {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "validation", errors: ["Le corps de la requête doit être un objet."] };
  }

  const data = input as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const passwordConfirmation = typeof data.passwordConfirmation === "string" ? data.passwordConfirmation : "";

  const errors: string[] = [];
  if (!name) errors.push("Le nom est requis.");
  if (!email) errors.push("L'email est requis.");
  if (email && !emailPattern.test(email)) errors.push("L'email est invalide.");
  if (!password) errors.push("Le mot de passe est requis.");
  if (password && password.length < minPasswordLength) {
    errors.push(`Le mot de passe doit contenir au moins ${minPasswordLength} caractères.`);
  }
  if (!passwordConfirmation) errors.push("La confirmation du mot de passe est requise.");
  if (password && passwordConfirmation && password !== passwordConfirmation) {
    errors.push("Les mots de passe ne correspondent pas.");
  }

  if (errors.length > 0) {
    return { ok: false, code: "validation", errors };
  }

  const existingUser = await repo.getUserByEmail(email);
  if (existingUser) {
    return { ok: false, code: "conflict", errors: ["Un compte existe déjà avec cet email."] };
  }

  const createdUser = await repo.createEditorUser({
    name,
    email,
    passwordHash: await hashPassword(password)
  });

  if (!createdUser) {
    return { ok: false, code: "conflict", errors: ["Un compte existe déjà avec cet email."] };
  }

  const authResponse = createAuthResponse(createdUser);
  if (!authResponse.ok) {
    return { ok: false, code: "validation", errors: authResponse.errors };
  }

  return authResponse;
};
