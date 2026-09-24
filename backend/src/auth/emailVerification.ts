import { createHash, randomBytes } from "node:crypto";

type AppEnv = Record<string, string | undefined>;

export const emailVerificationTtlMinutes = 24 * 60;

export const generateEmailVerificationToken = () => randomBytes(32).toString("base64url");

export const hashEmailVerificationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const buildEmailVerificationUrl = (token: string, env: AppEnv = process.env) => {
  const appUrl = env.PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const url = new URL("/verify-email", appUrl);
  url.searchParams.set("token", token);
  return url.toString();
};
