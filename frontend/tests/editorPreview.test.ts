import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readEditorPreviewSnapshot, useEditorStore } from "../src/stores/editor";

describe("editor preview snapshot geolocation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the manually set coordinates as EXACT without calling the geocoding API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const store = useEditorStore();
    store.editorForm.occurrences[0].city = "Descartes";
    store.editorForm.occurrences[0].latitude = 46.5;
    store.editorForm.occurrences[0].longitude = 1.2;
    store.setManualLocation(0, true);

    const token = await store.savePreviewSnapshot();
    const snapshot = readEditorPreviewSnapshot(token);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(snapshot?.event.occurrences[0]).toMatchObject({
      latitude: 46.5,
      longitude: 1.2,
      geolocationPrecision: "EXACT"
    });
  });

  it("geocodes the current address when no manual coordinates are set", async () => {
    const fetchMock = vi.fn((url: string) => {
      expect(url).toBe(
        "/api/geocoding?city=Descartes&address=1+rue+du+centre&postalCode=37160&venueName=Salle"
      );
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ latitude: 46.97, longitude: 0.7, geolocationPrecision: "EXACT" })
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = useEditorStore();
    store.editorForm.occurrences[0].venueName = "Salle";
    store.editorForm.occurrences[0].address = "1 rue du centre";
    store.editorForm.occurrences[0].postalCode = "37160";
    store.editorForm.occurrences[0].city = "Descartes";

    const token = await store.savePreviewSnapshot();
    const snapshot = readEditorPreviewSnapshot(token);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snapshot?.event.occurrences[0]).toMatchObject({
      latitude: 46.97,
      longitude: 0.7,
      geolocationPrecision: "EXACT"
    });
  });

  it("marks the location as unresolved without calling the API when the city is blank", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const store = useEditorStore();
    store.editorForm.occurrences[0].address = "1 rue du centre";

    const token = await store.savePreviewSnapshot();
    const snapshot = readEditorPreviewSnapshot(token);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(snapshot?.event.occurrences[0]).toMatchObject({
      latitude: null,
      longitude: null,
      geolocationPrecision: "UNRESOLVED"
    });
  });

  it("falls back to unresolved when geocoding fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ errors: ["Adresse introuvable."] }) }))
    );

    const store = useEditorStore();
    store.editorForm.occurrences[0].city = "Descartes";

    const token = await store.savePreviewSnapshot();
    const snapshot = readEditorPreviewSnapshot(token);

    expect(snapshot?.event.occurrences[0]).toMatchObject({
      latitude: null,
      longitude: null,
      geolocationPrecision: "UNRESOLVED"
    });
  });

  it("resolves each occurrence's location independently", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ latitude: 47.1, longitude: 1.1, geolocationPrecision: "APPROXIMATE" })
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const store = useEditorStore();
    store.editorForm.occurrences[0].city = "Descartes";
    store.addOccurrence();
    store.editorForm.occurrences[1].latitude = 48.0;
    store.editorForm.occurrences[1].longitude = 2.0;
    store.setManualLocation(1, true);

    const token = await store.savePreviewSnapshot();
    const snapshot = readEditorPreviewSnapshot(token);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snapshot?.event.occurrences[0]).toMatchObject({ geolocationPrecision: "APPROXIMATE" });
    expect(snapshot?.event.occurrences[1]).toMatchObject({
      latitude: 48.0,
      longitude: 2.0,
      geolocationPrecision: "EXACT"
    });
  });
});
