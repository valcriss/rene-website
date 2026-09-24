import { createHash, randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

const actorFingerprint = (actorId: string | undefined) =>
  actorId ? createHash("sha256").update(actorId).digest("hex").slice(0, 16) : undefined;

const routeTemplate = (req: Request) => {
  const routePath = typeof req.route?.path === "string" ? req.route.path : undefined;
  return routePath ? `${req.baseUrl}${routePath}` : req.baseUrl || req.path;
};

export const requestLogging = (req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  res.locals.requestId = requestId;
  res.set("X-Request-Id", requestId);

  res.on("finish", () => {
    const entry = {
      event: "http_request",
      requestId,
      method: req.method,
      route: routeTemplate(req),
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      actor: actorFingerprint(req.user?.id)
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  });
  next();
};

export const safeErrorMessage = (error: unknown) =>
  error instanceof Error ? error.name : "UnknownError";
