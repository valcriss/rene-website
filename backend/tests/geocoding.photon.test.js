"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const photon_1 = require("../src/geocoding/photon");
describe("photon geocoding", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it("builds query from parts", () => {
        const query = (0, photon_1.buildPhotonQuery)({
            address: "1 rue du centre",
            venueName: "Salle",
            postalCode: "37160",
            city: "Descartes"
        });
        expect(query).toBe("1 rue du centre Salle 37160 Descartes");
    });
    it("returns null when query is empty", async () => {
        const result = await (0, photon_1.geocodeEventLocation)({
            address: "",
            venueName: "",
            postalCode: "",
            city: ""
        });
        expect(result).toBeNull();
    });
    it("throws when photon responds with error", async () => {
        global.fetch = jest.fn(async () => ({ ok: false, status: 500 }));
        await expect((0, photon_1.geocodeAddress)("query")).rejects.toThrow("Photon request failed with status 500");
    });
    it("uses PHOTON_URL when provided", async () => {
        process.env.PHOTON_URL = "http://example.test/";
        const fetchSpy = jest.fn(async () => ({ ok: true, json: async () => ({ features: [] }) }));
        global.fetch = fetchSpy;
        await (0, photon_1.geocodeAddress)("query");
        expect(fetchSpy).toHaveBeenCalledWith("http://example.test/api?q=query&limit=1");
        delete process.env.PHOTON_URL;
    });
    it("returns null when no coordinates", async () => {
        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ features: [] }) }));
        await expect((0, photon_1.geocodeAddress)("query")).resolves.toBeNull();
    });
    it("returns null when coordinates invalid", async () => {
        global.fetch = jest.fn(async () => ({
            ok: true,
            json: async () => ({ features: [{ geometry: { coordinates: ["bad", "data"] } }] })
        }));
        await expect((0, photon_1.geocodeAddress)("query")).resolves.toBeNull();
    });
});
