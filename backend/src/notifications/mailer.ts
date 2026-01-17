import nodemailer from "nodemailer";
import { loadSmtpConfig } from "./smtpConfig";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
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
    const transporter = nodemailer.createTransport({
      host: config.value.host,
      port: config.value.port,
      secure: config.value.secure,
      auth: config.value.user && config.value.pass ? { user: config.value.user, pass: config.value.pass } : undefined
    });

    await transporter.sendMail({
      from: config.value.senderEmail,
      to: message.to,
      subject: message.subject,
      text: message.text
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { ok: false, errors: [message] };
  }
};
