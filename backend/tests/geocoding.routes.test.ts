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

  it("returns 400 when required params are missing", async () => {
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get("/api/geocoding");

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("L'adresse est requise.");
  });

  it("returns coordinates when geocoding succeeds", async () => {
    geocodeMock.mockResolvedValue({ latitude: 46.97, longitude: 0.7 });
    const app = express();
    app.use("/api", createGeocodingRouter());

    const response = await request(app).get(
      "/api/geocoding?address=1%20rue&postalCode=37160&city=Descartes&venueName=Salle"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ latitude: 46.97, longitude: 0.7 });
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
