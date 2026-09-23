import { Request, Response, Router } from "express";
import { AdminRepository } from "../admin/repository";
import { createRateLimiter } from "./rateLimiter";
import { submitContactMessage } from "./service";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Contact API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

const statusForCode = (code: "validation" | "rate_limited" | "notification") => {
  if (code === "rate_limited") return 429;
  if (code === "notification") return 502;
  return 400;
};

export const resolveClientKey = (req: Pick<Request, "ip">): string => req.ip ?? "unknown";

export const createContactRouter = (adminRepo: AdminRepository) => {
  const router = Router();
  const limiter = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

  router.post(
    "/contact",
    withErrorHandling(async (req, res) => {
      const clientKey = resolveClientKey(req);
      const result = await submitContactMessage(adminRepo, req.body, limiter, clientKey);
      if (!result.ok) {
        res.status(statusForCode(result.code)).json({ errors: result.errors });
        return;
      }
      res.json(result.value);
    })
  );

  return router;
};
