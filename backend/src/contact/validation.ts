import { ContactMessageInput } from "./types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameMaxLength = 120;
const messageMaxLength = 4000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const validateContactMessage = (input: unknown): ValidationResult<ContactMessageInput> => {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["Le corps de la requête doit être un objet."] };
  }

  const data = input as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const honeypot = typeof data.website === "string" ? data.website : "";

  const errors: string[] = [];

  if (!isNonEmptyString(name)) errors.push("Le nom est requis.");
  if (name.length > nameMaxLength) errors.push(`Le nom ne peut pas dépasser ${nameMaxLength} caractères.`);
  if (!isNonEmptyString(email)) errors.push("L'email est requis.");
  if (email && !emailPattern.test(email)) errors.push("L'email est invalide.");
  if (!isNonEmptyString(message)) errors.push("Le message est requis.");
  if (message.length > messageMaxLength) errors.push(`Le message ne peut pas dépasser ${messageMaxLength} caractères.`);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { name, email, message, honeypot } };
};
