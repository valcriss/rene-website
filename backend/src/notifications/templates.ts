import { Event } from "../events/types";

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");

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
