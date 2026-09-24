import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { requireRole } from "../auth/roles";
import { getAuthenticatedUser } from "../auth/request";
import {
  getDeclaredUploadFormat,
  MAX_UPLOAD_BYTES,
  processAndPersistUpload,
  UploadRejectedError
} from "./processor";
import { buildUploadUrl, isStoredUploadFilename, readStoredUpload } from "./storage";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_UPLOADS = 20;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

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

const enforceUploadRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const actor = getAuthenticatedUser(req);
  const now = Date.now();
  const current = rateLimitBuckets.get(actor.id);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    : current;

  if (bucket.count >= RATE_LIMIT_MAX_UPLOADS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", retryAfter.toString());
    logRejection(req, "rate_limit");
    res.status(429).json({ message: "Trop de requêtes." });
    return;
  }

  bucket.count += 1;
  rateLimitBuckets.set(actor.id, bucket);
  next();
};

export const resetUploadRateLimitsForTests = () => rateLimitBuckets.clear();

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

export const createUploadRouter = () => {
  const router = Router();

  router.post(
    "/uploads",
    requireRole(["EDITOR", "MODERATOR", "ADMIN"]),
    enforceUploadRateLimit,
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
    if (!isStoredUploadFilename(req.params.filename)) {
      res.status(404).json({ message: "Image introuvable." });
      return;
    }

    try {
      const contents = await readStoredUpload(req.params.filename);
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
