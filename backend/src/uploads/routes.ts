import { Request, Response, Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { buildUploadUrl, ensureUploadDir } from "./storage";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
type UploadedFile = { originalname: string; mimetype: string; filename: string };
type RequestWithFile = Request & { file?: UploadedFile };
type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Uploads API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

const storage = multer.diskStorage({
  destination: (_req: Request, _file: UploadedFile, cb: DestinationCallback) => {
    cb(null, ensureUploadDir());
  },
  filename: (_req: Request, file: UploadedFile, cb: FilenameCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req: Request, file: UploadedFile, cb: FileFilterCallback) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("INVALID_IMAGE"));
      return;
    }
    cb(null, true);
  }
});

export const createUploadRouter = () => {
  const router = Router();

  router.post(
    "/uploads",
    (req, res, next) => {
      upload.single("image")(req, res, (err: unknown) => {
        if (err) {
          if (err instanceof Error && err.message === "INVALID_IMAGE") {
            res.status(400).json({ errors: ["Format d'image invalide."] });
            return;
          }
          res.status(500).json({ message: "Erreur interne du serveur." });
          return;
        }
        next();
      });
    },
    withErrorHandling(async (req, res) => {
      const request = req as RequestWithFile;
      if (!request.file) {
        res.status(400).json({ errors: ["Une image est requise."] });
        return;
      }

      res.status(201).json({ url: buildUploadUrl(request.file.filename) });
    })
  );

  return router;
};
