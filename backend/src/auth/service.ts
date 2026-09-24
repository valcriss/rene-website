import { notifyEmailVerificationRequested, notifyPasswordResetRequested } from "../notifications/service";
import { normalizeEmail } from "./email";
import {
  buildEmailVerificationUrl,
  emailVerificationTtlMinutes,
  generateEmailVerificationToken,
  hashEmailVerificationToken
} from "./emailVerification";
import { hashPassword, needsPasswordRehash, validatePassword, verifyPassword } from "./password";
import { AuthRepository } from "./repository";
import {
  buildPasswordResetUrl,
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetTokenTtlMinutes
} from "./resetToken";
import { AuthUser } from "./types";

export type LoginResult =
  | { ok: true; value: { user: AuthUser } }
  | { ok: false; errors: string[] };
export type SignupResult =
  | { ok: true; value: { user: AuthUser | null; message: string } }
  | { ok: false; errors: string[]; code: "validation" };
export type ForgotPasswordResult =
  | { ok: true; value: { message: string } }
  | { ok: false; errors: string[]; code: "validation" };
export type ResetPasswordResult =
  | { ok: true; value: { message: string } }
  | { ok: false; errors: string[]; code: "validation" | "invalid_token" | "expired_token" };
export type VerifyEmailResult =
  | { ok: true; value: { message: string } }
  | { ok: false; errors: string[]; code: "invalid_token" | "expired_token" };

const genericCredentialsError = "Identifiants invalides.";
const genericSignupMessage = "Si cette adresse peut être utilisée, un lien d’activation a été envoyé.";
const genericResetMessage = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.";
const minimumSensitiveResponseMs = 100;

const waitForMinimumDuration = async (startedAt: number) => {
  const remaining = minimumSensitiveResponseMs - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
};

const createAuthResponse = (user: AuthUser): { ok: true; value: { user: AuthUser } } => ({ ok: true, value: { user } });

const notifyInBackground = (task: Promise<{ ok: boolean; errors?: string[] }>, context: string) => {
  void task.then((result) => {
    if (!result.ok) {
      // eslint-disable-next-line no-console
      console.warn(`${context} notification failed`, result.errors);
    }
  });
};

export const login = async (repo: AuthRepository, input: unknown): Promise<LoginResult> => {
  if (!input || typeof input !== "object") return { ok: false, errors: ["Le corps de la requête doit être un objet."] };

  const data = input as Record<string, unknown>;
  const email = normalizeEmail(data.email);
  const password = typeof data.password === "string" ? data.password : "";
  const errors: string[] = [];
  if (!email) errors.push("L'email est requis ou invalide.");
  if (!password) errors.push("Le mot de passe est requis.");
  if (errors.length > 0) return { ok: false, errors };

  const user = await repo.getUserByEmail(email!);
  const passwordIsValid = await verifyPassword(password, user?.passwordHash ?? "");
  if (!user || !passwordIsValid || user.emailVerifiedAt === null) {
    return { ok: false, errors: [genericCredentialsError] };
  }

  if (needsPasswordRehash(user.passwordHash)) {
    try {
      await repo.updatePasswordHash(user.id, await hashPassword(password));
    } catch {
      // An opportunistic upgrade must not turn a valid authentication into a failure.
    }
  }
  return createAuthResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    emailVerifiedAt: user.emailVerifiedAt
  });
};

export const signup = async (repo: AuthRepository, input: unknown): Promise<SignupResult> => {
  const startedAt = Date.now();
  if (!input || typeof input !== "object") {
    return { ok: false, code: "validation", errors: ["Le corps de la requête doit être un objet."] };
  }
  const data = input as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = normalizeEmail(data.email);
  const password = typeof data.password === "string" ? data.password : "";
  const passwordConfirmation = typeof data.passwordConfirmation === "string" ? data.passwordConfirmation : "";
  const errors: string[] = [];
  if (!name) errors.push("Le nom est requis.");
  if (!email) errors.push("L'email est requis ou invalide.");
  if (!password) errors.push("Le mot de passe est requis.");
  if (password) errors.push(...validatePassword(password));
  if (!passwordConfirmation) errors.push("La confirmation du mot de passe est requise.");
  if (password && passwordConfirmation && password !== passwordConfirmation) errors.push("Les mots de passe ne correspondent pas.");
  if (errors.length > 0) return { ok: false, code: "validation", errors };

  // Do the same expensive password operation before the lookup to avoid a duplicate-email timing oracle.
  const passwordHash = await hashPassword(password);
  const existingUser = await repo.getUserByEmail(email!);
  if (existingUser) {
    await waitForMinimumDuration(startedAt);
    return { ok: true, value: { user: null, message: genericSignupMessage } };
  }

  const createdUser = await (repo.createUnverifiedEditorUser ?? repo.createEditorUser)({ name, email: email!, passwordHash });
  if (createdUser && repo.createEmailVerificationToken) {
    const token = generateEmailVerificationToken();
    await repo.createEmailVerificationToken(
      createdUser.id,
      hashEmailVerificationToken(token),
      new Date(Date.now() + emailVerificationTtlMinutes * 60 * 1000)
    );
    notifyInBackground(
      notifyEmailVerificationRequested(createdUser.email, buildEmailVerificationUrl(token), emailVerificationTtlMinutes),
      "Email verification"
    );
  }

  await waitForMinimumDuration(startedAt);
  return { ok: true, value: { user: createdUser, message: genericSignupMessage } };
};

export const requestPasswordReset = async (repo: AuthRepository, input: unknown): Promise<ForgotPasswordResult> => {
  const startedAt = Date.now();
  if (!input || typeof input !== "object") {
    return { ok: false, code: "validation", errors: ["Le corps de la requête doit être un objet."] };
  }
  const email = normalizeEmail((input as Record<string, unknown>).email);
  if (!email) return { ok: false, code: "validation", errors: ["L'email est requis ou invalide."] };

  const user = await repo.getUserByEmail(email);
  if (!user) {
    await hashPassword("password-reset-timing-placeholder");
  } else {
    const token = generatePasswordResetToken();
    await repo.createPasswordResetToken(
      user.id,
      hashPasswordResetToken(token),
      new Date(Date.now() + passwordResetTokenTtlMinutes * 60 * 1000)
    );
    notifyInBackground(
      notifyPasswordResetRequested(user.email, buildPasswordResetUrl(token), passwordResetTokenTtlMinutes),
      "Password reset"
    );
  }
  await waitForMinimumDuration(startedAt);
  return { ok: true, value: { message: genericResetMessage } };
};

export const resetPassword = async (repo: AuthRepository, input: unknown): Promise<ResetPasswordResult> => {
  if (!input || typeof input !== "object") return { ok: false, code: "validation", errors: ["Le corps de la requête doit être un objet."] };
  const data = input as Record<string, unknown>;
  const token = typeof data.token === "string" ? data.token.trim() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const passwordConfirmation = typeof data.passwordConfirmation === "string" ? data.passwordConfirmation : "";
  const errors: string[] = [];
  if (!token) errors.push("Le jeton de réinitialisation est requis.");
  if (!password) errors.push("Le mot de passe est requis.");
  if (password) errors.push(...validatePassword(password));
  if (!passwordConfirmation) errors.push("La confirmation du mot de passe est requise.");
  if (password && passwordConfirmation && password !== passwordConfirmation) errors.push("Les mots de passe ne correspondent pas.");
  if (errors.length > 0) return { ok: false, code: "validation", errors };

  const passwordResetToken = await repo.getPasswordResetTokenByHash(hashPasswordResetToken(token));
  if (!passwordResetToken) return { ok: false, code: "invalid_token", errors: ["Le lien de réinitialisation est invalide ou a déjà été utilisé."] };
  if (passwordResetToken.expiresAt.getTime() <= Date.now()) {
    await repo.deletePasswordResetTokensByUserId(passwordResetToken.userId);
    return { ok: false, code: "expired_token", errors: ["Le lien de réinitialisation a expiré."] };
  }

  await repo.updatePasswordHash(passwordResetToken.userId, await hashPassword(password));
  await repo.markEmailVerified?.(passwordResetToken.userId);
  await repo.invalidateUserSessions?.(passwordResetToken.userId);
  await repo.deletePasswordResetTokensByUserId(passwordResetToken.userId);
  return { ok: true, value: { message: "Le mot de passe a été réinitialisé." } };
};

export const verifyEmail = async (repo: AuthRepository, token: string): Promise<VerifyEmailResult> => {
  const verification = await repo.getEmailVerificationTokenByHash?.(hashEmailVerificationToken(token));
  if (!verification) return { ok: false, code: "invalid_token", errors: ["Le lien de vérification est invalide ou a déjà été utilisé."] };
  if (verification.expiresAt.getTime() <= Date.now()) {
    await repo.deleteEmailVerificationTokensByUserId?.(verification.userId);
    return { ok: false, code: "expired_token", errors: ["Le lien de vérification a expiré."] };
  }
  await repo.markEmailVerified?.(verification.userId);
  await repo.deleteEmailVerificationTokensByUserId?.(verification.userId);
  return { ok: true, value: { message: "Votre adresse email est vérifiée. Vous pouvez vous connecter." } };
};
