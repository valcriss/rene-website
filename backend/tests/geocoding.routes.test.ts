import express from "express";
import request from "supertest";
import { createGeocodingRouter } from "../src/geocoding/routes";
import { geocodeEventLocation } from "../src/geocoding/photon";

jest.mock("../src/geocoding/photon", () => ({
  geocodeEventLocation: jest.fn()
}));

const geocodeMock = geocodeEventLocation as jest.Mock;

describe("geocoding routes", () => {
  beforeEach(() => {
    geocodeMock.mockReset();
  });

  it("returns 400 when the city is missing", async () => {
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get("/api/geocoding");

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(["La ville est requise et doit contenir au plus 160 caractères."]);
    expect(geocodeMock).not.toHaveBeenCalled();
  });

  it("rejects oversized geocoding fields before calling Photon", async () => {
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get(`/api/geocoding?city=${"a".repeat(161)}`);

    expect(response.status).toBe(400);
    expect(geocodeMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized optional geocoding field", async () => {
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get(`/api/geocoding?city=Descartes&address=${"a".repeat(161)}`);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(["Les champs de géocodage doivent contenir au plus 160 caractères."]);
  });

  it("returns a retryable error when its distributed quota is exhausted", async () => {
    const app = express();
    const rateLimitRepository = { consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 42 }) };
    app.use("/api", createGeocodingRouter(rateLimitRepository));

    const response = await request(app).get("/api/geocoding?city=Descartes");

    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBe("42");
    expect(geocodeMock).not.toHaveBeenCalled();
  });

  it("returns coordinates when geocoding succeeds", async () => {
    geocodeMock.mockResolvedValue({ latitude: 46.97, longitude: 0.7, geolocationPrecision: "EXACT" });
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get(
      "/api/geocoding?address=1%20rue&postalCode=37160&city=Descartes&venueName=Salle"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ latitude: 46.97, longitude: 0.7, geolocationPrecision: "EXACT" });
    expect(geocodeMock).toHaveBeenCalledWith({
      address: "1 rue",
      postalCode: "37160",
      city: "Descartes",
      venueName: "Salle"
    });
  });

  it("geocodes with only a city when address, postal code and venue are omitted", async () => {
    geocodeMock.mockResolvedValue({ latitude: 46.97, longitude: 0.7, geolocationPrecision: "APPROXIMATE" });
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get("/api/geocoding?city=Descartes");

    expect(response.status).toBe(200);
    expect(geocodeMock).toHaveBeenCalledWith({
      address: null,
      postalCode: null,
      city: "Descartes",
      venueName: null
    });
  });

  it("returns 404 when address is not found", async () => {
    geocodeMock.mockResolvedValue(null);
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get(
      "/api/geocoding?address=1%20rue&postalCode=37160&city=Descartes&venueName=Salle"
    );

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Adresse introuvable.");
  });

  it("returns 500 when geocoding throws", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    geocodeMock.mockRejectedValue(new Error("boom"));
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get(
      "/api/geocoding?address=1%20rue&postalCode=37160&city=Descartes&venueName=Salle"
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
