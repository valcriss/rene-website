jest.mock("../src/communes/service", () => ({
  searchCommunes: jest.fn()
}));

import express from "express";
import request from "supertest";
import { createCommunesRouter } from "../src/communes/routes";
import { searchCommunes } from "../src/communes/service";

const searchCommunesMock = searchCommunes as jest.Mock;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api", createCommunesRouter({} as never));
  return app;
};

describe("communes routes", () => {
  afterEach(() => {
    searchCommunesMock.mockReset();
  });

  it("returns the matching communes", async () => {
    const communes = [{ id: "1", codeInsee: "37069", codePostal: "37160", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" }];
    searchCommunesMock.mockResolvedValue({ ok: true, value: communes });
    const app = buildApp();

    const response = await request(app).get("/api/communes").query({ postalCode: "37160" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(communes);
    expect(searchCommunesMock).toHaveBeenCalledWith({}, { postalCode: "37160", q: undefined });
  });

  it("passes the name query through", async () => {
    searchCommunesMock.mockResolvedValue({ ok: true, value: [] });
    const app = buildApp();

    await request(app).get("/api/communes").query({ q: "Descartes" });

    expect(searchCommunesMock).toHaveBeenCalledWith({}, { postalCode: undefined, q: "Descartes" });
  });

  it("returns 400 when the service reports a validation error", async () => {
    searchCommunesMock.mockResolvedValue({ ok: false, errors: ["Le code postal ou le nom de la commune est requis."] });
    const app = buildApp();

    const response = await request(app).get("/api/communes");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ errors: ["Le code postal ou le nom de la commune est requis."] });
  });

  it("returns 500 when the handler throws", async () => {
    searchCommunesMock.mockRejectedValue(new Error("boom"));
    const app = buildApp();

    const response = await request(app).get("/api/communes").query({ postalCode: "37160" });

    expect(response.status).toBe(500);
  });
});
