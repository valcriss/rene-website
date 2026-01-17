import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeEventLocation } from "../src/api/geocoding";

describe("geocoding api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns coordinates when address is found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ latitude: 46.97, longitude: 0.7 })
        })
      )
    );

    await expect(
      geocodeEventLocation({
        address: "1 rue du centre",
        postalCode: "37160",
        city: "Descartes",
        venueName: "Salle"
      })
    ).resolves.toEqual({ latitude: 46.97, longitude: 0.7 });
  });

  it("throws API errors when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ errors: ["Adresse introuvable."] })
        })
      )
    );

    await expect(
      geocodeEventLocation({
        address: "1 rue du centre",
        postalCode: "37160",
        city: "Descartes",
        venueName: "Salle"
      })
    ).rejects.toThrow("Adresse introuvable.");
  });

  it("throws API message when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "Service indisponible." })
        })
      )
    );

    await expect(
      geocodeEventLocation({
        address: "1 rue du centre",
        postalCode: "37160",
        city: "Descartes",
        venueName: "Salle"
      })
    ).rejects.toThrow("Service indisponible.");
  });

  it("falls back to default message when response is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.reject(new Error("boom"))
        })
      )
    );

    await expect(
      geocodeEventLocation({
        address: "1 rue du centre",
        postalCode: "37160",
        city: "Descartes",
        venueName: "Salle"
      })
    ).rejects.toThrow("Adresse introuvable.");
  });
});
