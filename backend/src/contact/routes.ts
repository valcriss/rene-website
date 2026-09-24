import { Request, Response, Router } from "express";
import { AdminRepository } from "../admin/repository";
import { AuthRepository } from "../auth/repository";
import { createRequestRateLimiter, enforceRequestRateLimit } from "../security/rateLimiter";
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

const statusForCode = (code: "validation" | "notification") => {
  if (code === "notification") return 502;
  return 400;
};

const contactRateLimitPolicy = {
  action: "contact",
  ip: { max: 5, windowMs: 15 * 60 * 1000 }
};

export const createContactRouter = (
  adminRepo: AdminRepository,
  rateLimitRepository?: Pick<AuthRepository, "consumeRateLimit">
) => {
  const router = Router();
  const rateLimiter = createRequestRateLimiter(rateLimitRepository);

  router.post(
    "/contact",
    withErrorHandling(async (req, res) => {
      if (!(await enforceRequestRateLimit(rateLimiter, req, res, contactRateLimitPolicy))) return;
      const result = await submitContactMessage(adminRepo, req.body);
      if (!result.ok) {
        res.status(statusForCode(result.code)).json({ errors: result.errors });
        return;
      }
      res.json(result.value);
    })
  );

  return router;
};
