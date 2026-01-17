import express from "express";
import request from "supertest";

type MulterHandler = (req: unknown, res: unknown, cb: (err?: unknown) => void) => void;
type MulterMock = (() => { single: () => MulterHandler }) & { diskStorage: () => unknown };

const buildApp = async () => {
  const { createUploadRouter } = await import("../src/uploads/routes");
  const app = express();
  app.use("/api", createUploadRouter());
  return app;
};

describe("uploads routes errors", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("returns 500 when multer throws", async () => {
    jest.doMock("multer", () => {
      const multerMock: MulterMock = () => ({
        single: () => (_req: unknown, _res: unknown, cb: (err?: unknown) => void) => cb(new Error("boom"))
      });
      multerMock.diskStorage = () => ({});
      return { __esModule: true, default: multerMock };
    });

    const app = await buildApp();
    const response = await request(app).post("/api/uploads");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
  });

  it("returns 500 when handler throws", async () => {
    jest.doMock("multer", () => {
      const multerMock: MulterMock = () => ({
        single: () => (req: unknown, _res: unknown, cb: (err?: unknown) => void) => {
          if (typeof req === "object" && req !== null) {
            (req as { file?: { filename: string; originalname: string; mimetype: string } }).file = {
              filename: "file.png",
              originalname: "file.png",
              mimetype: "image/png"
            };
          }
          cb();
        }
      });
      multerMock.diskStorage = () => ({});
      return { __esModule: true, default: multerMock };
    });

    jest.doMock("../src/uploads/storage", () => ({
      ensureUploadDir: () => "tmp",
      buildUploadUrl: () => {
        throw new Error("boom");
      }
    }));

    const app = await buildApp();
    const response = await request(app).post("/api/uploads");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
  });
});
