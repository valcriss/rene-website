import {
  buildDeletedBody,
  buildPublishedBody,
  buildRejectedBody,
  buildResubmittedBody,
  buildResubmittedSubject,
  buildSubmittedBody
} from "../src/notifications/templates";
import { Event, EventOccurrence } from "../src/events/types";

const baseOccurrence: EventOccurrence = {
  id: "occ-1",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: "1 rue",
  postalCode: "37160",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  geolocationPrecision: "EXACT",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const baseEvent: Event = {
  id: "1",
  title: "Concert",
  content: "Texte",
  image: "img",
  createdByUserId: null,
  categoryId: "music",
  audienceId: "all",
  occurrences: [baseOccurrence],
  organizerName: "Association",
  status: "PENDING",
  publishedAt: null,
  publicationEndAt: "2026-01-15T22:00:00.000Z",
  rejectionReason: null,
  pendingRevision: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("notification templates", () => {
  it("uses fallback rejection reason", () => {
    const event: Event = { ...baseEvent, status: "REJECTED" };

    const body = buildRejectedBody(event);
    expect(body).toContain("Non précisé");
  });

  it("builds resubmission subject", () => {
    const subject = buildResubmittedSubject(baseEvent);
    expect(subject).toContain("Resoumission");
  });

  it("builds resubmission body", () => {
    const body = buildResubmittedBody(baseEvent);
    expect(body).toContain("resoumis");
    expect(body).toContain("Salle, Descartes");
  });

  it("builds published body", () => {
    const event: Event = { ...baseEvent, status: "PUBLISHED", publishedAt: "2026-01-01T00:00:00.000Z" };

    const body = buildPublishedBody(event);
    expect(body).toContain("publié");
  });

  it("builds submitted body", () => {
    const body = buildSubmittedBody(baseEvent);
    expect(body).toContain("en attente");
  });

  it("builds deleted body", () => {
    const event: Event = { ...baseEvent, status: "REJECTED" };

    const body = buildDeletedBody(event);
    expect(body).toContain("supprimé");
  });

  it("lists several occurrences in the body", () => {
    const event: Event = {
      ...baseEvent,
      occurrences: [
        baseOccurrence,
        { ...baseOccurrence, id: "occ-2", venueName: "Autre salle", city: "Tours" }
      ]
    };

    const body = buildDeletedBody(event);
    expect(body).toContain("1. Salle, Descartes");
    expect(body).toContain("2. Autre salle, Tours");
  });

  it("falls back to placeholders for an occurrence with unset fields", () => {
    const event: Event = {
      ...baseEvent,
      occurrences: [
        { ...baseOccurrence, venueName: null, city: null, eventStartAt: null, eventEndAt: null }
      ]
    };

    const body = buildDeletedBody(event);
    expect(body).toContain("Non renseigné, Non renseignée");
    expect(body).toContain("Non renseignée → Non renseignée");
  });

  it("builds deleted body for a title-only draft with no occurrences", () => {
    const event: Event = {
      ...baseEvent,
      title: "Brouillon",
      content: null,
      image: null,
      categoryId: null,
      audienceId: null,
      occurrences: [],
      organizerName: null,
      status: "DRAFT"
    };

    const body = buildDeletedBody(event);
    expect(body).toContain("Aucune date renseignée pour le moment.");
  });
});
