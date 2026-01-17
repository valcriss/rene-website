import {
  buildDeletedBody,
  buildPublishedBody,
  buildRejectedBody,
  buildResubmittedBody,
  buildResubmittedSubject,
  buildSubmittedBody
} from "../src/notifications/templates";
import { Event } from "../src/events/types";

describe("notification templates", () => {
  it("uses fallback rejection reason", () => {
    const event: Event = {
      id: "1",
      title: "Concert",
      content: "Texte",
      image: "img",
      createdByUserId: null,
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association",
      status: "REJECTED",
      publishedAt: null,
      publicationEndAt: "2026-01-15T22:00:00.000Z",
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };

    const body = buildRejectedBody(event);
    expect(body).toContain("Non précisé");
  });

  it("builds resubmission subject", () => {
    const event: Event = {
      id: "1",
      title: "Concert",
      content: "Texte",
      image: "img",
      createdByUserId: null,
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association",
      status: "PENDING",
      publishedAt: null,
      publicationEndAt: "2026-01-15T22:00:00.000Z",
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };

    const subject = buildResubmittedSubject(event);
    expect(subject).toContain("Resoumission");
  });

  it("builds resubmission body", () => {
    const event: Event = {
      id: "1",
      title: "Concert",
      content: "Texte",
      image: "img",
      createdByUserId: null,
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association",
      status: "PENDING",
      publishedAt: null,
      publicationEndAt: "2026-01-15T22:00:00.000Z",
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };

    const body = buildResubmittedBody(event);
    expect(body).toContain("resoumis");
  });

  it("builds published body", () => {
    const event: Event = {
      id: "1",
      title: "Concert",
      content: "Texte",
      image: "img",
      createdByUserId: null,
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      publicationEndAt: "2026-01-15T22:00:00.000Z",
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };

    const body = buildPublishedBody(event);
    expect(body).toContain("publié");
  });

  it("builds submitted body", () => {
    const event: Event = {
      id: "1",
      title: "Concert",
      content: "Texte",
      image: "img",
      createdByUserId: null,
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association",
      status: "PENDING",
      publishedAt: null,
      publicationEndAt: "2026-01-15T22:00:00.000Z",
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };

    const body = buildSubmittedBody(event);
    expect(body).toContain("en attente");
  });

  it("builds deleted body", () => {
    const event: Event = {
      id: "1",
      title: "Concert",
      content: "Texte",
      image: "img",
      createdByUserId: null,
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Association",
      status: "REJECTED",
      publishedAt: null,
      publicationEndAt: "2026-01-15T22:00:00.000Z",
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };

    const body = buildDeletedBody(event);
    expect(body).toContain("supprimé");
  });
});
