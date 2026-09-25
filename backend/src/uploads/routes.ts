import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { AuthRepository } from "../auth/repository";
import { requireRole } from "../auth/roles";
import { getAuthenticatedUser } from "../auth/request";
import { createRequestRateLimiter, enforceRequestRateLimit } from "../security/rateLimiter";
import {
  getDeclaredUploadFormat,
  MAX_UPLOAD_BYTES,
  processAndPersistUpload,
  UploadRejectedError
} from "./processor";
import { buildUploadUrl, isStoredUploadFilename, readStoredUpload } from "./storage";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

const uploadRateLimitPolicy = {
  action: "upload",
  ip: { max: 30, windowMs: 15 * 60 * 1000 },
  actor: { max: 20, windowMs: 15 * 60 * 1000 }
};

const logRejection = (req: Request, reason: string) => {
  // Never log a client-provided filename or a filesystem path.
  // eslint-disable-next-line no-console
  console.warn("Upload rejected", { actorId: getAuthenticatedUser(req).id, reason });
};

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Uploads API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 0,
    parts: 2
  },
  fileFilter: (_req: Request, file: { originalname: string; mimetype: string }, cb: FileFilterCallback) => {
    if (!getDeclaredUploadFormat(file.originalname, file.mimetype)) {
      cb(new UploadRejectedError());
      return;
    }
    cb(null, true);
  }
});

const parseSingleImage = (req: Request, res: Response, next: NextFunction) => {
  upload.single("image")(req, res, (error: unknown) => {
    if (error) {
      logRejection(req, error instanceof multer.MulterError ? error.code : "invalid_file");
      res.status(400).json({ errors: ["Image refusée."] });
      return;
    }
    next();
  });
};

export const createUploadRouter = (rateLimitRepository?: Pick<AuthRepository, "consumeRateLimit">) => {
  const router = Router();
  const rateLimiter = createRequestRateLimiter(rateLimitRepository);

  router.post(
    "/uploads",
    requireRole(["EDITOR", "MODERATOR", "ADMIN"]),
    async (req, res, next) => {
      if (await enforceRequestRateLimit(rateLimiter, req, res, uploadRateLimitPolicy)) next();
    },
    parseSingleImage,
    withErrorHandling(async (req, res) => {
      if (!req.file) {
        logRejection(req, "missing_file");
        res.status(400).json({ errors: ["Une image est requise."] });
        return;
      }

      try {
        const filename = await processAndPersistUpload(req.file);
        res.status(201).json({ url: buildUploadUrl(filename) });
      } catch (error) {
        if (error instanceof UploadRejectedError) {
          logRejection(req, "invalid_content");
          res.status(400).json({ errors: ["Image refusée."] });
          return;
        }
        throw error;
      }
    })
  );

  return router;
};

export const createUploadedAssetRouter = () => {
  const router = Router();

  router.get("/:filename", withErrorHandling(async (req, res) => {
    const filename = req.params.filename as string;
    if (!isStoredUploadFilename(filename)) {
      res.status(404).json({ message: "Image introuvable." });
      return;
    }

    try {
      const contents = await readStoredUpload(filename);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Cross-Origin-Resource-Policy", "same-site");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.send(contents);
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") {
        res.status(404).json({ message: "Image introuvable." });
        return;
      }
      throw error;
    }
  }));

  return router;
};
