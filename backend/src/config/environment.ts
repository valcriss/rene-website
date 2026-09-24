import fs from "node:fs";

type Environment = Record<string, string | undefined>;
type SecretReader = (path: string) => string;

export type EnvironmentValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const productionSecrets = ["DATABASE_URL", "JWT_SECRET", "CRON_SECRET", "SMTP_PASSWORD"] as const;
const weakSecrets = new Set([
  "change-me",
  "changeme",
  "password",
  "password123",
  "rene",
  "secret",
  "test-secret"
]);

const defaultSecretReader: SecretReader = (filePath) => fs.readFileSync(filePath, "utf8");

const hasMinimumSecretEntropy = (value: string) => value.length >= 32 && new Set(value).size >= 16;

const hydrateSecret = (
  name: (typeof productionSecrets)[number],
  env: Environment,
  readSecret: SecretReader,
  errors: string[]
) => {
  const directValue = env[name]?.trim();
  const fileVariable = `${name}_FILE`;
  const filePath = env[fileVariable]?.trim();

  if (directValue && filePath) {
    errors.push(`${name} and ${fileVariable} cannot both be set`);
    return;
  }

  if (!filePath) return;

  try {
    const value = readSecret(filePath).trim();
    if (!value) {
      errors.push(`${fileVariable} must reference a non-empty secret`);
      return;
    }
    env[name] = value;
  } catch {
    errors.push(`${fileVariable} could not be read`);
  }
};

const validateStrongSecret = (name: "JWT_SECRET" | "CRON_SECRET", env: Environment, errors: string[]) => {
  const value = env[name]?.trim();
  if (!value) {
    errors.push(`${name} is required`);
    return;
  }
  if (weakSecrets.has(value.toLowerCase()) || !hasMinimumSecretEntropy(value)) {
    errors.push(`${name} must contain at least 32 characters with sufficient diversity`);
  }
};

const validateDatabaseUrl = (env: Environment, errors: string[]) => {
  const value = env.DATABASE_URL?.trim();
  if (!value) {
    errors.push("DATABASE_URL is required");
    return;
  }

  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      errors.push("DATABASE_URL must use the postgres or postgresql protocol");
    }
    if (!url.username || !url.password) {
      errors.push("DATABASE_URL must contain application credentials");
    }
    if (["postgres", "root"].includes(url.username.toLowerCase())) {
      errors.push("DATABASE_URL must use a dedicated non-superuser application account");
    }
    const password = decodeURIComponent(url.password);
    if (
      password.length < 16 ||
      password.toLowerCase() === decodeURIComponent(url.username).toLowerCase()
    ) {
      errors.push("DATABASE_URL must use a strong, non-default application password");
    }
  } catch {
    errors.push("DATABASE_URL must be a valid URL");
  }
};

const validateHttpUrl = (name: string, value: string | undefined, errors: string[]) => {
  if (!value?.trim()) {
    errors.push(`${name} is required`);
    return;
  }
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push(`${name} must use the http or https protocol`);
    }
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
};

const validateSmtp = (env: Environment, errors: string[]) => {
  if (!env.SMTP_HOST?.trim()) errors.push("SMTP_HOST is required");
  if (!env.SENDER_EMAIL?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SENDER_EMAIL)) {
    errors.push("SENDER_EMAIL must be a valid email address");
  }

  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD?.trim();
  if (Boolean(user) !== Boolean(password)) {
    errors.push("SMTP_USER and SMTP_PASSWORD must be set together");
  }
};

const validatePort = (env: Environment, errors: string[]) => {
  const value = env.PORT?.trim() || "3000";
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("PORT must be an integer between 1 and 65535");
  }
};

export const validateProductionEnvironment = (
  env: Environment = process.env,
  readSecret: SecretReader = defaultSecretReader
): EnvironmentValidationResult => {
  if (env.NODE_ENV !== "production") return { ok: true };

  const errors: string[] = [];
  productionSecrets.forEach((name) => hydrateSecret(name, env, readSecret, errors));
  validateDatabaseUrl(env, errors);
  validateStrongSecret("JWT_SECRET", env, errors);
  validateStrongSecret("CRON_SECRET", env, errors);
  validateHttpUrl("PHOTON_URL", env.PHOTON_URL, errors);
  validateHttpUrl("SITE_URL", env.SITE_URL, errors);
  validateSmtp(env, errors);
  validatePort(env, errors);

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
};

export const assertValidProductionEnvironment = (
  env: Environment = process.env,
  readSecret: SecretReader = defaultSecretReader
) => {
  const result = validateProductionEnvironment(env, readSecret);
  if (!result.ok) {
    throw new Error(`Invalid production configuration: ${result.errors.join("; ")}`);
  }
};
