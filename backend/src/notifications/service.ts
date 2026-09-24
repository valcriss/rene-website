import { Event } from "../events/types";
import { AuthRepository } from "../auth/repository";
import { CategorySubscriptionRepository } from "../subscriptions/repository";
import { sendEmail, MailResult } from "./mailer";
import {
  buildPasswordResetBody,
  buildPasswordResetSubject,
  buildEmailVerificationBody,
  buildEmailVerificationSubject,
  buildSubmittedBody,
  buildSubmittedSubject,
  buildResubmittedBody,
  buildResubmittedSubject,
  buildPublishedBody,
  buildPublishedSubject,
  buildRejectedBody,
  buildRejectedSubject,
  buildDeletedBody,
  buildDeletedSubject,
  buildModerationReminderBody,
  buildModerationReminderSubject,
  buildContactMessageBody,
  buildContactMessageSubject,
  buildUserInvitationBody,
  buildUserInvitationSubject
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

// When a subscription repository is supplied, moderators/admins who unsubscribed from the
// event's category are skipped; without one (e.g. callers that don't care about subscriptions),
// everyone with the role is notified, matching the previous unconditional behavior.
const resolveSubscribedModeratorEmails = async (
  categoryId: string | null,
  authRepo: AuthRepository,
  subscriptionRepo?: CategorySubscriptionRepository
): Promise<string[]> => {
  const moderators = await authRepo.listUsersByRole(["MODERATOR", "ADMIN"]);
  if (!categoryId || !subscriptionRepo) {
    return moderators.map((user) => user.email);
  }

  const results = await Promise.all(
    moderators.map(async (user) => {
      const unsubscribedIds = await subscriptionRepo.listUnsubscribedCategoryIds(user.id);
      return unsubscribedIds.includes(categoryId) ? null : user.email;
    })
  );

  return results.filter((email): email is string => email !== null);
};

export const notifyEventSubmitted = async (
  event: Event,
  authRepo: AuthRepository,
  subscriptionRepo?: CategorySubscriptionRepository
): Promise<MailResult> => {
  const emails = await resolveSubscribedModeratorEmails(event.categoryId, authRepo, subscriptionRepo);
  return sendToMany(emails, buildSubmittedSubject(event), buildSubmittedBody(event));
};

export const notifyEventResubmitted = async (
  event: Event,
  authRepo: AuthRepository,
  subscriptionRepo?: CategorySubscriptionRepository
): Promise<MailResult> => {
  const emails = await resolveSubscribedModeratorEmails(event.categoryId, authRepo, subscriptionRepo);
  return sendToMany(emails, buildResubmittedSubject(event), buildResubmittedBody(event));
};

export const notifyModerationReminder = async (event: Event, authRepo: AuthRepository): Promise<MailResult> => {
  const moderators = await authRepo.listUsersByRole(["MODERATOR", "ADMIN"]);
  const emails = moderators.map((user) => user.email);
  return sendToMany(emails, buildModerationReminderSubject(event), buildModerationReminderBody(event));
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

export const notifyPasswordResetRequested = async (
  email: string,
  resetUrl: string,
  ttlMinutes: number
): Promise<MailResult> =>
  sendEmail({
    to: email,
    subject: buildPasswordResetSubject(),
    text: buildPasswordResetBody(resetUrl, ttlMinutes)
  });

export const notifyEmailVerificationRequested = async (
  email: string,
  verificationUrl: string,
  ttlMinutes: number
): Promise<MailResult> =>
  sendEmail({
    to: email,
    subject: buildEmailVerificationSubject(),
    text: buildEmailVerificationBody(verificationUrl, ttlMinutes)
  });

export const notifyContactMessage = async (
  to: string,
  contact: { name: string; email: string; message: string }
): Promise<MailResult> =>
  sendEmail({
    to,
    subject: buildContactMessageSubject(contact.name),
    text: buildContactMessageBody(contact.name, contact.email, contact.message),
    replyTo: contact.email
  });

export const notifyUserInvited = async (
  email: string,
  name: string,
  setPasswordUrl: string,
  ttlMinutes: number
): Promise<MailResult> =>
  sendEmail({
    to: email,
    subject: buildUserInvitationSubject(),
    text: buildUserInvitationBody(name, setPasswordUrl, ttlMinutes)
  });
