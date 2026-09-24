import { Request, Response, Router } from "express";
import { EventRepository } from "./repository";
import { getPublicEvent, listPublicEvents } from "./service";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Public events API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

export const createPublicEventsRouter = (repo: EventRepository) => {
  const router = Router();

  router.get(
    "/events",
    withErrorHandling(async (_req, res) => {
      const events = await listPublicEvents(repo);
      res.json(events);
    })
  );

  router.get(
    "/events/:id",
    withErrorHandling(async (req, res) => {
      const event = await getPublicEvent(repo, req.params.id);
      if (!event) {
        res.status(404).json({ message: "Événement introuvable." });
        return;
      }
      res.json(event);
    })
  );

  return router;
};
