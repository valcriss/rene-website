import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useCommunesStore } from "../src/stores/communes";

const commune = { id: "1", codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" };

describe("communes store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty list without calling the API for an incomplete postal code", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const store = useCommunesStore();
    const results = await store.searchByPostalCode("371");

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.isLoading("371")).toBe(false);
    expect(store.getError("371")).toBeNull();
  });

  it("fetches and caches communes for a valid postal code", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([commune]) }));
    vi.stubGlobal("fetch", fetchMock);

    const store = useCommunesStore();
    const results = await store.searchByPostalCode(" 37160 ");

    expect(results).toEqual([commune]);
    expect(store.getResults("37160")).toEqual([commune]);
    expect(store.isLoading("37160")).toBe(false);
    expect(store.getError("37160")).toBeNull();

    await store.searchByPostalCode("37160");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("records an error and returns an empty list when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Service indisponible." }) }))
    );

    const store = useCommunesStore();
    const results = await store.searchByPostalCode("37160");

    expect(results).toEqual([]);
    expect(store.getError("37160")).toBe("Service indisponible.");
    expect(store.isLoading("37160")).toBe(false);
  });

  it("handles unknown error values", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject("oops")));

    const store = useCommunesStore();
    await store.searchByPostalCode("37160");

    expect(store.getError("37160")).toBe("Erreur inconnue");
  });

  it("returns default values for postal codes that have not been searched", () => {
    const store = useCommunesStore();

    expect(store.getResults("00000")).toEqual([]);
    expect(store.isLoading("00000")).toBe(false);
    expect(store.getError("00000")).toBeNull();
  });
});
