import express from "express";
import request from "supertest";
import { authHeader } from "./authTestUtils";

type MulterHandler = (req: unknown, res: unknown, cb: (error?: unknown) => void) => void;
type MulterMock = (() => { single: () => MulterHandler }) & {
  memoryStorage: () => unknown;
  MulterError: unknown;
};

const buildApp = async () => {
  const { authenticateOptional } = await import("../src/auth/middleware");
  const { createUploadRouter } = await import("../src/uploads/routes");
  const app = express();
  app.use(authenticateOptional);
  app.use("/api", createUploadRouter());
  return app;
};

describe("uploads routes errors", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("returns a generic 400 when multipart parsing fails", async () => {
    jest.doMock("multer", () => {
      const multerMock: MulterMock = Object.assign(
        () => ({
          single: () => (_req: unknown, _res: unknown, cb: (error?: unknown) => void) => cb(new Error("boom"))
        }),
        { memoryStorage: () => ({}), MulterError: class extends Error {} }
      );
      return { __esModule: true, default: multerMock };
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await request(await buildApp())
      .post("/api/uploads")
      .set("Authorization", authHeader("EDITOR"));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ errors: ["Image refusée."] });
    expect(warnSpy).toHaveBeenCalledWith("Upload rejected", expect.objectContaining({ reason: "invalid_file" }));
  });

  it("returns a generic 500 when persistence fails", async () => {
    jest.doMock("multer", () => {
      const multerMock: MulterMock = Object.assign(
        () => ({
          single: () => (req: unknown, _res: unknown, cb: (error?: unknown) => void) => {
            if (typeof req === "object" && req !== null) {
              (req as { file?: object }).file = {
                buffer: Buffer.from("image"),
                originalname: "file.png",
                mimetype: "image/png"
              };
            }
            cb();
          }
        }),
        { memoryStorage: () => ({}), MulterError: class extends Error {} }
      );
      return { __esModule: true, default: multerMock };
    });
    jest.doMock("../src/uploads/processor", () => ({
      MAX_UPLOAD_BYTES: 1024,
      UploadRejectedError: class extends Error {},
      getDeclaredUploadFormat: () => "png",
      processAndPersistUpload: async () => {
        throw new Error("disk failure with C:\\secret\\path");
      }
    }));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(await buildApp())
      .post("/api/uploads")
      .set("Authorization", authHeader("EDITOR"));

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    expect(JSON.stringify(response.body)).not.toContain("secret");
    expect(errorSpy).toHaveBeenCalled();
  });
});
