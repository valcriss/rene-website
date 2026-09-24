import { Request, Response, Router } from "express";
import { requireRole } from "../auth/roles";
import { AdminRepository } from "../admin/repository";
import { CategorySubscriptionRepository } from "./repository";
import { listCategorySubscriptions, setCategorySubscription } from "./service";
import { getAuthenticatedUser } from "../auth/request";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Subscriptions API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

export const createSubscriptionsRouter = (
  subscriptionRepo: CategorySubscriptionRepository,
  adminRepo: AdminRepository
) => {
  const router = Router();

  router.get(
    "/categories",
    requireRole(["MODERATOR", "ADMIN"]),
    withErrorHandling(async (req, res) => {
      const userId = getAuthenticatedUser(req).id;

      const subscriptions = await listCategorySubscriptions(subscriptionRepo, adminRepo, userId);
      res.json(subscriptions);
    })
  );

  router.put(
    "/categories/:categoryId",
    requireRole(["MODERATOR", "ADMIN"]),
    withErrorHandling(async (req, res) => {
      const userId = getAuthenticatedUser(req).id;

      const result = await setCategorySubscription(subscriptionRepo, userId, req.params.categoryId, req.body?.subscribed);
      if (!result.ok) {
        res.status(400).json({ errors: result.errors });
        return;
      }

      res.json({ ok: true });
    })
  );

  return router;
};
