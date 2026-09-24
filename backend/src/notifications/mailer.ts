import nodemailer from "nodemailer";
import { loadSmtpConfig } from "./smtpConfig";

export const getSmtpTimeoutMs = () => {
  const configured = Number(process.env.SMTP_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return 10_000;
  return Math.min(60_000, Math.max(1_000, Math.floor(configured)));
};

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export type MailResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export const sendEmail = async (message: EmailMessage): Promise<MailResult> => {
  if (process.env.NODE_ENV === "test") {
    return { ok: true };
  }

  const config = loadSmtpConfig();
  if (!config.ok) {
    return { ok: false, errors: config.errors };
  }

  try {
    const timeout = getSmtpTimeoutMs();
    const transporter = nodemailer.createTransport({
      host: config.value.host,
      port: config.value.port,
      secure: config.value.secure,
      connectionTimeout: timeout,
      greetingTimeout: timeout,
      socketTimeout: timeout,
      auth: config.value.user && config.value.pass ? { user: config.value.user, pass: config.value.pass } : undefined
    });

    await transporter.sendMail({
      from: config.value.senderEmail,
      to: message.to,
      subject: message.subject,
      text: message.text,
      replyTo: message.replyTo
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { ok: false, errors: [message] };
  }
};
