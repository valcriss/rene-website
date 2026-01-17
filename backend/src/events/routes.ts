import { Request, Response, Router } from "express";
import { requireRole } from "../auth/roles";
import { EventRepository } from "./repository";
import { createEvent, deleteEvent, getEvent, listEvents, publishEvent, rejectEvent, submitEvent, updateEvent } from "./service";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Events API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

export const createEventRouter = (repo: EventRepository) => {
  const router = Router();

  router.get("/events", withErrorHandling(async (_req, res) => {
    const events = await listEvents(repo);
    res.json(events);
  }));

  router.get("/events/:id", withErrorHandling(async (req, res) => {
    const event = await getEvent(repo, req.params.id);
    if (!event) {
      res.status(404).json({ message: "Événement introuvable." });
      return;
    }
    res.json(event);
  }));

  router.post("/events", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const result = await createEvent(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }

    res.status(201).json(result.value);
  }));

  router.put("/events/:id", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const result = await updateEvent(repo, req.params.id, req.body);
    if (!result.ok) {
      const status = result.errors.includes("Événement introuvable.") ? 404 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  }));

  router.post("/events/:id/submit", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const result = await submitEvent(repo, req.params.id);
    if (!result.ok) {
      res.status(404).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  }));

  router.post("/events/:id/publish", requireRole(["MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const result = await publishEvent(repo, req.params.id);
    if (!result.ok) {
      res.status(404).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  }));

  router.post("/events/:id/reject", requireRole(["MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const result = await rejectEvent(repo, req.params.id, req.body?.rejectionReason);
    if (!result.ok) {
      const status = result.errors.includes("Événement introuvable.") ? 404 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  }));

  router.delete("/events/:id", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const result = await deleteEvent(repo, req.params.id);
    if (!result.ok) {
      const status = result.errors.includes("Événement introuvable.") ? 404 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  }));

  return router;
};
