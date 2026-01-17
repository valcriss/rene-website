"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const routes_1 = require("../src/geocoding/routes");
const photon_1 = require("../src/geocoding/photon");
jest.mock("../src/geocoding/photon", () => ({
    geocodeEventLocation: jest.fn()
}));
const geocodeMock = photon_1.geocodeEventLocation;
describe("geocoding routes", () => {
    beforeEach(() => {
        geocodeMock.mockReset();
    });
    it("returns 400 when required params are missing", async () => {
        const app = (0, express_1.default)();
        app.use("/api", (0, routes_1.createGeocodingRouter)());
        const response = await (0, supertest_1.default)(app).get("/api/geocoding");
        expect(response.status).toBe(400);
        expect(response.body.errors).toContain("L'adresse est requise.");
    });
    it("returns coordinates when geocoding succeeds", async () => {
        geocodeMock.mockResolvedValue({ latitude: 46.97, longitude: 0.7 });
        const app = (0, express_1.default)();
        app.use("/api", (0, routes_1.createGeocodingRouter)());
        const response = await (0, supertest_1.default)(app).get("/api/geocoding?address=1%20rue&postalCode=37160&city=Descartes&venueName=Salle");
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ latitude: 46.97, longitude: 0.7 });
    });
    it("returns 404 when address is not found", async () => {
        geocodeMock.mockResolvedValue(null);
        const app = (0, express_1.default)();
        app.use("/api", (0, routes_1.createGeocodingRouter)());
        const response = await (0, supertest_1.default)(app).get("/api/geocoding?address=1%20rue&postalCode=37160&city=Descartes&venueName=Salle");
        expect(response.status).toBe(404);
        expect(response.body.errors).toContain("Adresse introuvable.");
    });
    it("returns 500 when geocoding throws", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
        geocodeMock.mockRejectedValue(new Error("boom"));
        const app = (0, express_1.default)();
        app.use("/api", (0, routes_1.createGeocodingRouter)());
        const response = await (0, supertest_1.default)(app).get("/api/geocoding?address=1%20rue&postalCode=37160&city=Descartes&venueName=Salle");
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: "Erreur interne du serveur." });
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
