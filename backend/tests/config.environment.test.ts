import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertValidProductionEnvironment,
  validateProductionEnvironment
} from "../src/config/environment";

const strongSecret = (offset: number) =>
  Array.from({ length: 36 }, (_, index) => String.fromCharCode(33 + ((index + offset) % 90))).join("");
const strongJwt = strongSecret(0);
const strongCron = strongSecret(17);

const validEnvironment = (): Record<string, string | undefined> => ({
  NODE_ENV: "production",
  PORT: "3000",
  DATABASE_URL: "postgresql://rene_app:a-strong-database-password@db:5432/rene",
  JWT_SECRET: strongJwt,
  CRON_SECRET: strongCron,
  PHOTON_URL: "http://photon:2322",
  SMTP_HOST: "smtp.example.org",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SENDER_EMAIL: "noreply@example.org"
});

const errorsFor = (overrides: Record<string, string | undefined>) => {
  const result = validateProductionEnvironment({ ...validEnvironment(), ...overrides });
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
};

describe("production environment validation", () => {
  it("does not impose production requirements outside production", () => {
    expect(validateProductionEnvironment({ NODE_ENV: "development" })).toEqual({ ok: true });
    expect(validateProductionEnvironment()).toEqual({ ok: true });
  });

  it("accepts a complete production environment", () => {
    const env = validEnvironment();
    expect(validateProductionEnvironment(env)).toEqual({ ok: true });
    expect(() => assertValidProductionEnvironment(env)).not.toThrow();
  });

  it("hydrates secrets from files without exposing their values in errors", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rene-secrets-"));
    const values = {
      DATABASE_URL: validEnvironment().DATABASE_URL as string,
      JWT_SECRET: strongJwt,
      CRON_SECRET: strongCron,
      SMTP_PASSWORD: "smtp-password-with-sufficient-randomness"
    };
    const env = validEnvironment();
    delete env.DATABASE_URL;
    delete env.JWT_SECRET;
    delete env.CRON_SECRET;
    env.SMTP_USER = "mailer";

    for (const [name, value] of Object.entries(values)) {
      const filePath = path.join(directory, name.toLowerCase());
      fs.writeFileSync(filePath, `${value}\n`);
      env[`${name}_FILE`] = filePath;
    }

    expect(validateProductionEnvironment(env)).toEqual({ ok: true });
    expect(env.JWT_SECRET).toBe(strongJwt);
    expect(env.SMTP_PASSWORD).toBe(values.SMTP_PASSWORD);
  });

  it("rejects ambiguous, empty and unreadable secret files", () => {
    const ambiguous = errorsFor({ JWT_SECRET_FILE: "/secret/jwt" });
    expect(ambiguous).toContain("JWT_SECRET and JWT_SECRET_FILE cannot both be set");

    const emptyEnv = validEnvironment();
    delete emptyEnv.JWT_SECRET;
    emptyEnv.JWT_SECRET_FILE = "/secret/empty";
    const empty = validateProductionEnvironment(emptyEnv, () => "  ");
    expect(empty.ok).toBe(false);
    expect(empty.ok ? [] : empty.errors).toContain("JWT_SECRET_FILE must reference a non-empty secret");

    const missingEnv = validEnvironment();
    delete missingEnv.CRON_SECRET;
    missingEnv.CRON_SECRET_FILE = "/secret/missing";
    const missing = validateProductionEnvironment(missingEnv, () => {
      throw new Error("sensitive path details");
    });
    expect(missing.ok).toBe(false);
    expect(missing.ok ? [] : missing.errors).toContain("CRON_SECRET_FILE could not be read");
    expect(JSON.stringify(missing)).not.toContain("sensitive path details");
  });

  it("rejects missing, weak and malformed core settings", () => {
    expect(errorsFor({ DATABASE_URL: "" })).toContain("DATABASE_URL is required");
    expect(errorsFor({ DATABASE_URL: "not-a-url" })).toContain("DATABASE_URL must be a valid URL");
    expect(errorsFor({ DATABASE_URL: "mysql://rene_app:password@db/rene" })).toContain(
      "DATABASE_URL must use the postgres or postgresql protocol"
    );
    expect(errorsFor({ DATABASE_URL: "postgresql://db/rene" })).toContain(
      "DATABASE_URL must contain application credentials"
    );
    expect(errorsFor({ DATABASE_URL: "postgresql://postgres:password@db/rene" })).toContain(
      "DATABASE_URL must use a dedicated non-superuser application account"
    );
    expect(errorsFor({ JWT_SECRET: "" })).toContain("JWT_SECRET is required");
    expect(errorsFor({ JWT_SECRET: "change-me" })).toContain(
      "JWT_SECRET must contain at least 32 characters with sufficient diversity"
    );
    expect(errorsFor({ JWT_SECRET: "short-secret" })).toContain(
      "JWT_SECRET must contain at least 32 characters with sufficient diversity"
    );
    expect(errorsFor({ JWT_SECRET: "a".repeat(40) })).toContain(
      "JWT_SECRET must contain at least 32 characters with sufficient diversity"
    );
    expect(errorsFor({ CRON_SECRET: "" })).toContain("CRON_SECRET is required");
    expect(errorsFor({ CRON_SECRET: "short-secret" })).toContain(
      "CRON_SECRET must contain at least 32 characters with sufficient diversity"
    );
    expect(errorsFor({ DATABASE_URL: "postgresql://rene:rene@db/rene" })).toContain(
      "DATABASE_URL must use a strong, non-default application password"
    );
    expect(
      errorsFor({ DATABASE_URL: "postgresql://sameapplicationuser:sameapplicationuser@db/rene" })
    ).toContain("DATABASE_URL must use a strong, non-default application password");
  });

  it("validates service URLs, mail settings and ports", () => {
    expect(errorsFor({ PHOTON_URL: "" })).toContain("PHOTON_URL is required");
    expect(errorsFor({ PHOTON_URL: "not-a-url" })).toContain("PHOTON_URL must be a valid URL");
    expect(errorsFor({ PHOTON_URL: "ftp://photon/data" })).toContain(
      "PHOTON_URL must use the http or https protocol"
    );
    expect(errorsFor({ SMTP_HOST: "" })).toContain("SMTP_HOST is required");
    expect(errorsFor({ SENDER_EMAIL: "invalid" })).toContain("SENDER_EMAIL must be a valid email address");
    expect(errorsFor({ SMTP_USER: "mailer", SMTP_PASSWORD: "" })).toContain(
      "SMTP_USER and SMTP_PASSWORD must be set together"
    );
    expect(errorsFor({ SMTP_USER: "", SMTP_PASSWORD: "password" })).toContain(
      "SMTP_USER and SMTP_PASSWORD must be set together"
    );
    expect(errorsFor({ PORT: "1.5" })).toContain("PORT must be an integer between 1 and 65535");
    expect(errorsFor({ PORT: "0" })).toContain("PORT must be an integer between 1 and 65535");
    expect(errorsFor({ PORT: "65536" })).toContain("PORT must be an integer between 1 and 65535");
    expect(validateProductionEnvironment({ ...validEnvironment(), PORT: "" })).toEqual({ ok: true });
  });

  it("throws a value-free startup error for invalid production configuration", () => {
    expect(() => assertValidProductionEnvironment({ NODE_ENV: "production" })).toThrow(
      /^Invalid production configuration:/
    );
  });
});
