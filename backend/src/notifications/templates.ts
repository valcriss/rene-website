import { Event } from "../events/types";

const formatDate = (value: string) => new Date(value).toLocaleDateString("fr-FR");

export const buildSubmittedSubject = (event: Event) => `Nouvelle soumission : ${event.title}`;

export const buildSubmittedBody = (event: Event) =>
  `Un événement est en attente de modération.\n\nTitre : ${event.title}\n` +
  `Lieu : ${event.venueName}, ${event.city}\n` +
  `Dates : ${formatDate(event.eventStartAt)} → ${formatDate(event.eventEndAt)}\n\n` +
  `Connectez-vous au backoffice pour valider ou refuser.`;

export const buildResubmittedSubject = (event: Event) => `Resoumission : ${event.title}`;

export const buildResubmittedBody = (event: Event) =>
  `Un événement précédemment refusé a été resoumis.\n\nTitre : ${event.title}\n` +
  `Lieu : ${event.venueName}, ${event.city}\n` +
  `Dates : ${formatDate(event.eventStartAt)} → ${formatDate(event.eventEndAt)}\n\n` +
  `Merci de le revoir dans le backoffice.`;

export const buildPublishedSubject = (event: Event) => `Événement publié : ${event.title}`;

export const buildPublishedBody = (event: Event) =>
  `Votre événement a été publié.\n\nTitre : ${event.title}\n` +
  `Lieu : ${event.venueName}, ${event.city}\n` +
  `Dates : ${formatDate(event.eventStartAt)} → ${formatDate(event.eventEndAt)}\n`;

export const buildRejectedSubject = (event: Event) => `Événement refusé : ${event.title}`;

export const buildRejectedBody = (event: Event) =>
  `Votre événement a été refusé.\n\nTitre : ${event.title}\n` +
  `Motif : ${event.rejectionReason ?? "Non précisé"}\n\n` +
  `Vous pouvez le corriger et le soumettre à nouveau.`;

export const buildDeletedSubject = (event: Event) => `Événement supprimé : ${event.title}`;

export const buildDeletedBody = (event: Event) =>
  `Votre événement a été supprimé.\n\nTitre : ${event.title}\n` +
  `Lieu : ${event.venueName}, ${event.city}\n` +
  `Dates : ${formatDate(event.eventStartAt)} → ${formatDate(event.eventEndAt)}\n`;

export const buildPasswordResetSubject = () => "Réinitialisation de votre mot de passe";

export const buildPasswordResetBody = (resetUrl: string, ttlMinutes: number) =>
  `Une demande de réinitialisation de mot de passe a été reçue pour votre compte R3ne.\n\n` +
  `Utilisez ce lien pour définir un nouveau mot de passe :\n${resetUrl}\n\n` +
  `Ce lien expire dans ${ttlMinutes} minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.`;
