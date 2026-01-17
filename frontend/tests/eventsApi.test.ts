import { afterEach, describe, expect, it, vi } from "vitest";
import { createEvent, deleteEvent, fetchEvents, submitEvent, updateEvent } from "../src/api/events";

describe("events api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    await expect(fetchEvents()).resolves.toEqual([]);
  });

  it("fails when fetching events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) }))
    );

    await expect(fetchEvents()).rejects.toThrow("Impossible de charger les événements");
  });

  it("creates an event", async () => {
    const payload = {
      title: "Concert",
      content: "Desc",
      image: "img",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "Rue",
      postalCode: "37100",
      city: "Descartes",
      organizerName: "Asso",
      organizerUrl: "https://example.com",
      contactEmail: "contact@example.com",
      contactPhone: "0102030405",
      ticketUrl: "https://tickets.example.com",
      websiteUrl: "https://example.com"
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "1", ...payload, status: "DRAFT" }) }))
    );

    const created = await createEvent(payload, "EDITOR");
    expect(created.id).toBe("1");
  });

  it("fails to create an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );

    await expect(
      createEvent(
        {
          title: "Concert",
          content: "Desc",
          image: "img",
          categoryId: "music",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: "Rue",
          postalCode: "37100",
          city: "Descartes",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com"
        },
        "EDITOR"
      )
    ).rejects.toThrow("Impossible de créer l'événement");
  });

  it("surfaces API errors on create", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ errors: ["Adresse introuvable."] }) }))
    );

    await expect(
      createEvent(
        {
          title: "Concert",
          content: "Desc",
          image: "img",
          categoryId: "music",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: "Rue",
          postalCode: "37100",
          city: "Descartes",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com"
        },
        "EDITOR"
      )
    ).rejects.toThrow("Adresse introuvable.");
  });

  it("updates an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "1", status: "DRAFT" }) }))
    );

    const updated = await updateEvent(
      "1",
      {
        title: "Concert",
        content: "Desc",
        image: "img",
        categoryId: "music",
        eventStartAt: "2026-01-15T20:00:00.000Z",
        eventEndAt: "2026-01-15T22:00:00.000Z",
        allDay: false,
        venueName: "Salle",
        address: "Rue",
        postalCode: "37100",
        city: "Descartes",
        organizerName: "Asso",
        organizerUrl: "https://example.com",
        contactEmail: "contact@example.com",
        contactPhone: "0102030405",
        ticketUrl: "https://tickets.example.com",
        websiteUrl: "https://example.com"
      },
      "EDITOR"
    );

    expect(updated.id).toBe("1");
  });

  it("fails to update an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );

    await expect(
      updateEvent(
        "1",
        {
          title: "Concert",
          content: "Desc",
          image: "img",
          categoryId: "music",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: "Rue",
          postalCode: "37100",
          city: "Descartes",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com"
        },
        "EDITOR"
      )
    ).rejects.toThrow("Impossible de mettre à jour l'événement");
  });

  it("surfaces API message on update", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Erreur serveur" }) }))
    );

    await expect(
      updateEvent(
        "1",
        {
          title: "Concert",
          content: "Desc",
          image: "img",
          categoryId: "music",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: "Rue",
          postalCode: "37100",
          city: "Descartes",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com"
        },
        "EDITOR"
      )
    ).rejects.toThrow("Erreur serveur");
  });

  it("falls back to default message when response is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.reject(new Error("boom")) }))
    );

    await expect(
      updateEvent(
        "1",
        {
          title: "Concert",
          content: "Desc",
          image: "img",
          categoryId: "music",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          allDay: false,
          venueName: "Salle",
          address: "Rue",
          postalCode: "37100",
          city: "Descartes",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com"
        },
        "EDITOR"
      )
    ).rejects.toThrow("Impossible de mettre à jour l'événement");
  });

  it("submits an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "1", status: "PENDING" }) }))
    );

    const submitted = await submitEvent("1", "EDITOR");
    expect(submitted.status).toBe("PENDING");
  });

  it("fails to submit an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );

    await expect(submitEvent("1", "EDITOR")).rejects.toThrow("Impossible de soumettre l'événement");
  });

  it("deletes an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "1" }) }))
    );

    await expect(deleteEvent("1", "EDITOR")).resolves.toEqual({ id: "1" });
  });

  it("fails to delete an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );

    await expect(deleteEvent("1", "EDITOR")).rejects.toThrow("Impossible de supprimer l'événement");
  });
});