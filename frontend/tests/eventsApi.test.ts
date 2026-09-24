import { afterEach, describe, expect, it, vi } from "vitest";
import { createEvent, deleteEvent, fetchEvents, fetchPublicEvents, submitEvent, updateEvent } from "../src/api/events";
import { setSessionExpiredHandler } from "../src/api/authHeaders";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const occurrenceInput = {
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: "Rue",
  postalCode: "37100",
  city: "Descartes"
};

describe("events api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSessionExpiredHandler(() => {});
  });

  it("fetches the public events", async () => {
    const fetchMock = vi.fn((url: string) => {
      expect(url).toBe("/api/public/events");
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPublicEvents()).resolves.toEqual([]);
  });

  it("fails when fetching the public events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) }))
    );

    await expect(fetchPublicEvents()).rejects.toThrow("Impossible de charger les événements");
  });

  it("fetches backoffice events without exposing a bearer token", async () => {
    window.localStorage.setItem("rene-auth-token", "token-1");
    const fetchMock = vi.fn((url: string, init?: { headers?: Record<string, string> }) => {
      expect(url).toBe("/api/events");
      expect(init?.headers?.Authorization).toBeUndefined();
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchEvents("EDITOR")).resolves.toEqual([]);
    window.localStorage.clear();
  });

  it("fails when fetching the backoffice events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) }))
    );

    await expect(fetchEvents("EDITOR")).rejects.toThrow("Impossible de charger les événements");
  });

  it("creates an event", async () => {
    const payload = {
      title: "Concert",
      content: "Desc",
      image: "img",
      categoryId: "music",
      occurrences: [occurrenceInput],
      organizerName: "Asso",
      organizerUrl: "https://example.com",
      contactEmail: "contact@example.com",
      contactPhone: "0102030405",
      ticketUrl: "https://tickets.example.com",
      websiteUrl: "https://example.com",
      socialLinks: [{ type: "FACEBOOK" as const, url: "https://facebook.com/rene" }],
      audienceId: "all"
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
          occurrences: [occurrenceInput],
          audienceId: "all",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com",
          socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }]
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
          occurrences: [occurrenceInput],
          audienceId: "all",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com",
          socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }]
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
        occurrences: [occurrenceInput],
        audienceId: "all",
        organizerName: "Asso",
        organizerUrl: "https://example.com",
        contactEmail: "contact@example.com",
        contactPhone: "0102030405",
        ticketUrl: "https://tickets.example.com",
        websiteUrl: "https://example.com",
        socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }]
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
          occurrences: [occurrenceInput],
          audienceId: "all",
          organizerName: "Asso",
          organizerUrl: "https://example.com",
          contactEmail: "contact@example.com",
          contactPhone: "0102030405",
          ticketUrl: "https://tickets.example.com",
          websiteUrl: "https://example.com",
          socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }]
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
          occurrences: [occurrenceInput],
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
          occurrences: [occurrenceInput],
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
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ errors: ["Adresse à corriger."] }) }))
    );

    await expect(submitEvent("1", "EDITOR")).rejects.toThrow("Adresse à corriger.");
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

  it("triggers the session-expired handler instead of throwing on a 401, for every authenticated call", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }))
    );

    const payload = {
      title: "Concert",
      content: "Desc",
      image: "img",
      categoryId: "music",
      occurrences: [occurrenceInput],
      audienceId: "all",
      organizerName: "Asso"
    };
    const calls = [
      fetchEvents("EDITOR"),
      createEvent(payload, "EDITOR"),
      updateEvent("1", payload, "EDITOR"),
      submitEvent("1", "EDITOR"),
      deleteEvent("1", "EDITOR")
    ];
    const settledFlags = calls.map(() => false);
    calls.forEach((call, index) => {
      call.then(
        () => (settledFlags[index] = true),
        () => (settledFlags[index] = true)
      );
    });

    await flushPromises();

    expect(handler).toHaveBeenCalledTimes(calls.length);
    expect(settledFlags.every((settled) => settled === false)).toBe(true);
  });
});
