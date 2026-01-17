import express from "express";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createUploadRouter } from "../src/uploads/routes";

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));

describe("uploads routes", () => {
  const originalDir = process.env.UPLOAD_DIR;

  afterEach(() => {
    process.env.UPLOAD_DIR = originalDir;
  });

  it("uploads an image", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const app = express();
    app.use("/api", createUploadRouter());

    const response = await request(app)
      .post("/api/uploads")
      .attach("image", Buffer.from("image"), {
        filename: "photo.png",
        contentType: "image/png"
      });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\//);

    const files = fs.readdirSync(dir);
    expect(files.length).toBe(1);
  });

  it("returns 400 for missing file", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const app = express();
    app.use("/api", createUploadRouter());

    const response = await request(app).post("/api/uploads");

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Une image est requise.");
  });

  it("returns 400 for invalid file type", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const app = express();
    app.use("/api", createUploadRouter());

    const response = await request(app)
      .post("/api/uploads")
      .attach("image", Buffer.from("text"), {
        filename: "note.txt",
        contentType: "text/plain"
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Format d'image invalide.");
  });
});
