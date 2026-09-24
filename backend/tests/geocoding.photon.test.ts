import {
  buildPhotonQueries,
  buildPhotonQuery,
  geocodeAddress,
  geocodeEventLocation,
  getPhotonTimeoutMs
} from "../src/geocoding/photon";

describe("photon geocoding", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds ordered fallback queries from parts", () => {
    const queries = buildPhotonQueries({
      address: "1 rue du centre",
      venueName: "Salle",
      postalCode: "37160",
      city: "Descartes"
    });
    expect(queries).toEqual([
      { query: "1 rue du centre 37160 Descartes", geolocationPrecision: "EXACT" },
      { query: "1 rue du centre Salle 37160 Descartes", geolocationPrecision: "EXACT" },
      { query: "Salle 37160 Descartes", geolocationPrecision: "APPROXIMATE" },
      { query: "37160 Descartes", geolocationPrecision: "APPROXIMATE" },
      { query: "Descartes", geolocationPrecision: "APPROXIMATE" }
    ]);
  });

  it("builds the legacy single query helper", () => {
    expect(
      buildPhotonQuery({
        address: "1 rue du centre",
        venueName: "Salle",
        postalCode: "37160",
        city: "Descartes"
      })
    ).toBe("1 rue du centre Salle 37160 Descartes");
  });

  it("returns null when query is empty", async () => {
    const result = await geocodeEventLocation({
      address: "",
      venueName: "",
      postalCode: "",
      city: ""
    });
    expect(result).toBeNull();
  });

  it("returns approximate result after falling back to city", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [{ geometry: { coordinates: [0.7, 46.97] } }] })
      }) as unknown as typeof fetch;

    await expect(
      geocodeEventLocation({
        address: "1 rue du centre",
        venueName: "Salle",
        postalCode: "37160",
        city: "Descartes"
      })
    ).resolves.toEqual({ latitude: 46.97, longitude: 0.7, geolocationPrecision: "APPROXIMATE" });
  });

  it("returns null when every fallback attempt is exhausted", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) }) as unknown as typeof fetch;

    await expect(
      geocodeEventLocation({
        address: "1 rue du centre",
        venueName: "Salle",
        postalCode: "37160",
        city: "Descartes"
      })
    ).resolves.toBeNull();
  });

  it("throws when photon responds with error", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    await expect(geocodeAddress("query")).rejects.toThrow("Photon request failed with status 500");
  });

  it("bounds the configurable Photon timeout", () => {
    delete process.env.PHOTON_TIMEOUT_MS;
    expect(getPhotonTimeoutMs()).toBe(3_000);
    process.env.PHOTON_TIMEOUT_MS = "invalid";
    expect(getPhotonTimeoutMs()).toBe(3_000);
    process.env.PHOTON_TIMEOUT_MS = "1";
    expect(getPhotonTimeoutMs()).toBe(500);
    process.env.PHOTON_TIMEOUT_MS = "1500.9";
    expect(getPhotonTimeoutMs()).toBe(1_500);
    process.env.PHOTON_TIMEOUT_MS = "99999";
    expect(getPhotonTimeoutMs()).toBe(10_000);
    delete process.env.PHOTON_TIMEOUT_MS;
  });

  it("reports an outbound timeout and preserves other outbound errors", async () => {
    global.fetch = jest.fn(async () => { throw Object.assign(new Error("slow"), { name: "TimeoutError" }); }) as unknown as typeof fetch;
    await expect(geocodeAddress("query")).rejects.toThrow("Photon request timed out");

    global.fetch = jest.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    await expect(geocodeAddress("query")).rejects.toThrow("offline");
  });

  it("uses PHOTON_URL when provided", async () => {
    process.env.PHOTON_URL = "http://example.test/";
    const fetchSpy = jest.fn(async () => ({ ok: true, json: async () => ({ features: [] }) }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    await geocodeAddress("query");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://example.test/api?q=query&limit=1",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    delete process.env.PHOTON_URL;
  });

  it("returns null when no coordinates", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ features: [] }) })) as unknown as typeof fetch;
    await expect(geocodeAddress("query")).resolves.toBeNull();
  });

  it("returns null when coordinates invalid", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ features: [{ geometry: { coordinates: ["bad", "data"] } }] })
    })) as unknown as typeof fetch;
    await expect(geocodeAddress("query")).resolves.toBeNull();
  });
});
