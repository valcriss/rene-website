import { Request, Response, Router } from "express";
import { requireRole } from "../auth/roles";
import { AuthRepository } from "../auth/repository";
import { CategorySubscriptionRepository } from "../subscriptions/repository";
import { EventRepository } from "./repository";
import { archiveEvent, createEvent, deleteEvent, getEvent, getEventForActor, listEvents, publishEvent, rejectEvent, submitEvent, unarchiveEvent, updateEvent, updateEventFeatured, updateEventSlug } from "./service";
import {
  notifyEventDeleted,
  notifyEventPublished,
  notifyEventRejected,
  notifyEventSubmitted,
  notifyEventResubmitted
} from "../notifications/service";
import { Event } from "./types";
import { computePublicationEndAt } from "./occurrences";
import { getAuthenticatedUser } from "../auth/request";
import { auditLogger } from "../security/audit";
import { safeErrorMessage } from "../security/logging";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const auditEvent = (req: Request, res: Response, action: string, target: string) =>
  auditLogger.record({ requestId: res.locals.requestId, actorId: req.user?.id, action, target, outcome: "success" });

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: "events_api_error", error: safeErrorMessage(error) }));
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

const toRevisionSnapshot = (event: Event): Event => {
  const revision = event.pendingRevision!;

  return {
    ...event,
    ...revision,
    id: event.id,
    createdByUserId: event.createdByUserId,
    status: revision.status,
    publishedAt: event.publishedAt,
    publicationEndAt: computePublicationEndAt(revision.occurrences).toISOString(),
    rejectionReason: revision.rejectionReason,
    pendingRevision: revision,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
};

export const createEventRouter = (
  repo: EventRepository,
  authRepo: AuthRepository,
  subscriptionRepo?: CategorySubscriptionRepository
) => {
  const router = Router();

  router.get("/events", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const events = await listEvents(repo, getAuthenticatedUser(req));
    res.json(events);
  }));

  router.get("/events/:id", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const result = await getEventForActor(repo, eventId, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  }));

  router.post("/events", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const result = await createEvent(repo, req.body, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }

    res.status(201).json(result.value);
  }));

  router.put("/events/:id", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const result = await updateEvent(repo, eventId, req.body, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }

    res.json(result.value);
  }));

  router.post("/events/:id/submit", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const current = await getEvent(repo, eventId);
    const result = await submitEvent(repo, eventId, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }
    const wasRejected = current?.status === "REJECTED" || current?.pendingRevision?.status === "REJECTED";
    const notificationEvent = current?.status === "PUBLISHED" ? toRevisionSnapshot(result.value) : result.value;
    const notification = wasRejected
      ? await notifyEventResubmitted(notificationEvent, authRepo, subscriptionRepo)
      : await notifyEventSubmitted(notificationEvent, authRepo, subscriptionRepo);
    if (!notification.ok) {
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify({ event: "event_notification_failed", action: "submit" }));
    }
    await auditEvent(req, res, "event.submit", `event:${result.value.id}`);
    res.json(result.value);
  }));

  router.post("/events/:id/publish", requireRole(["MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const result = await publishEvent(repo, eventId, getAuthenticatedUser(req), req.body?.featured ?? false);
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }
    const notification = await notifyEventPublished(result.value, authRepo);
    if (!notification.ok) {
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify({ event: "event_notification_failed", action: "publish" }));
    }
    await auditEvent(req, res, "event.publish", `event:${result.value.id}`);
    res.json(result.value);
  }));

  router.post("/events/:id/archive", requireRole(["ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const result = await archiveEvent(repo, eventId, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }
    await auditEvent(req, res, "event.archive", `event:${result.value.id}`);
    res.json(result.value);
  }));

  router.post("/events/:id/unarchive", requireRole(["ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const result = await unarchiveEvent(repo, eventId, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }
    await auditEvent(req, res, "event.unarchive", `event:${result.value.id}`);
    res.json(result.value);
  }));

  router.patch("/events/:id/featured", requireRole(["ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const result = await updateEventFeatured(repo, eventId, req.body?.featured, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }

    await auditEvent(req, res, "event.feature", `event:${result.value.id}`);
    res.json(result.value);
  }));

  router.patch("/events/:id/slug", requireRole(["ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const result = await updateEventSlug(repo, eventId, req.body?.slug, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }

    await auditEvent(req, res, "event.slug", `event:${result.value.id}`);
    res.json(result.value);
  }));

  router.post("/events/:id/reject", requireRole(["MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const current = await getEvent(repo, eventId);
    const result = await rejectEvent(repo, eventId, req.body?.rejectionReason, getAuthenticatedUser(req));
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }
    const notificationEvent = current?.status === "PUBLISHED" ? toRevisionSnapshot(result.value) : result.value;
    const notification = await notifyEventRejected(notificationEvent, authRepo);
    if (!notification.ok) {
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify({ event: "event_notification_failed", action: "reject" }));
    }
    await auditEvent(req, res, "event.reject", `event:${result.value.id}`);
    res.json(result.value);
  }));

  router.delete("/events/:id", requireRole(["EDITOR", "MODERATOR", "ADMIN"]), withErrorHandling(async (req, res) => {
    const eventId = req.params.id as string;
    const current = await getEvent(repo, eventId);
    const user = getAuthenticatedUser(req);
    const result = await deleteEvent(repo, eventId, {
      id: user.id,
      role: user.role,
    });
    if (!result.ok) {
      res.status(result.status).json({ errors: result.errors });
      return;
    }
    if (current) {
      const notification = await notifyEventDeleted(current, authRepo);
      if (!notification.ok) {
        // eslint-disable-next-line no-console
        console.warn(JSON.stringify({ event: "event_notification_failed", action: "delete" }));
      }
    }
    await auditEvent(req, res, "event.delete", `event:${eventId}`);
    res.json(result.value);
  }));

  return router;
};
