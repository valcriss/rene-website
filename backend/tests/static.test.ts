import path from "node:path";
import { promises as fs } from "node:fs";
import express from "express";
import request from "supertest";
import { registerStatic } from "../src/static";

const frontendDist = path.resolve(__dirname, "../../frontend/dist");

describe("registerStatic", () => {
  beforeAll(async () => {
    await fs.mkdir(frontendDist, { recursive: true });
    await fs.writeFile(path.join(frontendDist, "index.html"), "<h1>Index</h1>");
    await fs.writeFile(path.join(frontendDist, "hello.txt"), "hello");
  });

  afterAll(async () => {
    await fs.rm(frontendDist, { recursive: true, force: true });
  });

  it("serves static assets", async () => {
    const app = express();
    registerStatic(app);

    const response = await request(app).get("/hello.txt");

    expect(response.status).toBe(200);
    expect(response.text).toBe("hello");
  });

  it("serves index.html for unmatched routes", async () => {
    const app = express();
    registerStatic(app);

    const response = await request(app).get("/some/route");

    expect(response.status).toBe(200);
    expect(response.text).toBe("<h1>Index</h1>");
  });
});
