import { createHash, randomBytes } from "node:crypto";

const passwordResetTokenBytes = 32;

export const passwordResetTokenTtlMinutes = 30;

export const generatePasswordResetToken = () => randomBytes(passwordResetTokenBytes).toString("base64url");

export const hashPasswordResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const buildPasswordResetUrl = (token: string, env: NodeJS.ProcessEnv = process.env) => {
  const appUrl = env.PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const url = new URL("/reset-password", appUrl);
  url.searchParams.set("token", token);
  return url.toString();
};