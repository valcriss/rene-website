import { Event } from "../events/types";
import { AuthRepository } from "../auth/repository";
import { sendEmail, MailResult } from "./mailer";
import {
  buildSubmittedBody,
  buildSubmittedSubject,
  buildResubmittedBody,
  buildResubmittedSubject,
  buildPublishedBody,
  buildPublishedSubject,
  buildRejectedBody,
  buildRejectedSubject,
  buildDeletedBody,
  buildDeletedSubject
} from "./templates";

const sendToMany = async (emails: string[], subject: string, text: string): Promise<MailResult> => {
  if (emails.length === 0) {
    return { ok: true };
  }

  const results = await Promise.all(
    emails.map((email) => sendEmail({ to: email, subject, text }))
  );

  const errors = results.flatMap((result) => (result.ok ? [] : result.errors));
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
};

const resolveCreatorEmail = async (event: Event, authRepo: AuthRepository) => {
  if (event.createdByUserId) {
    const user = await authRepo.getUserById(event.createdByUserId);
    if (user) {
      return user.email;
    }
  }
  return event.contactEmail ?? null;
};

export const notifyEventSubmitted = async (event: Event, authRepo: AuthRepository): Promise<MailResult> => {
  const moderators = await authRepo.listUsersByRole(["MODERATOR", "ADMIN"]);
  const emails = moderators.map((user) => user.email);
  return sendToMany(emails, buildSubmittedSubject(event), buildSubmittedBody(event));
};

export const notifyEventResubmitted = async (event: Event, authRepo: AuthRepository): Promise<MailResult> => {
  const moderators = await authRepo.listUsersByRole(["MODERATOR", "ADMIN"]);
  const emails = moderators.map((user) => user.email);
  return sendToMany(emails, buildResubmittedSubject(event), buildResubmittedBody(event));
};

export const notifyEventPublished = async (event: Event, authRepo: AuthRepository): Promise<MailResult> => {
  const email = await resolveCreatorEmail(event, authRepo);
  if (!email) return { ok: true };
  return sendEmail({ to: email, subject: buildPublishedSubject(event), text: buildPublishedBody(event) });
};

export const notifyEventRejected = async (event: Event, authRepo: AuthRepository): Promise<MailResult> => {
  const email = await resolveCreatorEmail(event, authRepo);
  if (!email) return { ok: true };
  return sendEmail({ to: email, subject: buildRejectedSubject(event), text: buildRejectedBody(event) });
};

export const notifyEventDeleted = async (event: Event, authRepo: AuthRepository): Promise<MailResult> => {
  const email = await resolveCreatorEmail(event, authRepo);
  if (!email) return { ok: true };
  return sendEmail({ to: email, subject: buildDeletedSubject(event), text: buildDeletedBody(event) });
};
