export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  senderEmail: string;
};

type ConfigResult =
  | { ok: true; value: SmtpConfig }
  | { ok: false; errors: string[] };

const toBoolean = (value: string | undefined) => {
  if (!value) return false;
  return value.trim().toLowerCase() === "true";
};

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const loadSmtpConfig = (): ConfigResult => {
  const errors: string[] = [];

  const host = process.env.SMTP_HOST?.trim() ?? "";
  const senderEmail = process.env.SENDER_EMAIL?.trim() ?? "";

  if (host.length === 0) errors.push("SMTP_HOST is required");
  if (senderEmail.length === 0) errors.push("SENDER_EMAIL is required");

  const port = toNumber(process.env.SMTP_PORT, 587);
  const secure = toBoolean(process.env.SMTP_SECURE);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      host,
      port,
      secure,
      user: user && user.length > 0 ? user : undefined,
      pass: pass && pass.length > 0 ? pass : undefined,
      senderEmail
    }
  };
};
