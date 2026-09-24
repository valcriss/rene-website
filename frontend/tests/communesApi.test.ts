import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCommunesByPostalCode } from "../src/api/communes";

describe("communes api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the matching communes", async () => {
    const communes = [{ id: "1", codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" }];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        expect(url).toBe("/api/communes?postalCode=37160");
        return Promise.resolve({ ok: true, json: () => Promise.resolve(communes) });
      })
    );

    await expect(fetchCommunesByPostalCode("37160")).resolves.toEqual(communes);
  });

  it("throws API errors when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ errors: ["Le code postal ou le nom de la commune est requis."] })
        })
      )
    );

    await expect(fetchCommunesByPostalCode("")).rejects.toThrow("Le code postal ou le nom de la commune est requis.");
  });

  it("throws API message when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Service indisponible." }) }))
    );

    await expect(fetchCommunesByPostalCode("37160")).rejects.toThrow("Service indisponible.");
  });

  it("falls back to default message when response is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.reject(new Error("boom")) }))
    );

    await expect(fetchCommunesByPostalCode("37160")).rejects.toThrow("Impossible de charger les communes.");
  });
});
