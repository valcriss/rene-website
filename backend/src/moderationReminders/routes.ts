import { Request, Response, Router } from "express";
import { AuthRepository } from "../auth/repository";
import { EventRepository } from "../events/repository";
import { ModerationReminderRepository } from "./repository";
import { runModerationReminderCheck } from "./service";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Moderation reminders API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

export const createModerationReminderRouter = (
  eventRepo: EventRepository,
  reminderRepo: ModerationReminderRepository,
  authRepo: AuthRepository
) => {
  const router = Router();

  router.post(
    "/moderation-reminders/check",
    withErrorHandling(async (req, res) => {
      const expectedSecret = process.env.CRON_SECRET;
      if (!expectedSecret) {
        res.status(500).json({ message: "CRON_SECRET is required" });
        return;
      }

      const providedSecret = req.header("x-cron-secret");
      if (providedSecret !== expectedSecret) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const result = await runModerationReminderCheck(eventRepo, reminderRepo, authRepo);
      res.json(result);
    })
  );

  return router;
};
