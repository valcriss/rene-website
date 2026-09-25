import compression from "compression";
import express from "express";
import { createAdminRouter } from "./admin/routes";
import { createPublicSettingsRouter } from "./admin/publicRoutes";
import { createAdminRepository } from "./admin/repositoryFactory";
import { createAuthenticationMiddleware, csrfProtection } from "./auth/middleware";
import { createAudiencesRouter } from "./audiences/routes";
import { createAuthRouter } from "./auth/routes";
import { createAuthRepository } from "./auth/repositoryFactory";
import { createCategoriesRouter } from "./categories/routes";
import { createCommunesRouter } from "./communes/routes";
import { createCommuneRepository } from "./communes/repositoryFactory";
import { getTrustedProxyHops } from "./config/trustProxy";
import { createContactRouter } from "./contact/routes";
import { createEventRouter } from "./events/routes";
import { createPublicEventsRouter } from "./events/publicRoutes";
import { createEventRepository } from "./events/repositoryFactory";
import { createGeocodingRouter } from "./geocoding/routes";
import { createModerationReminderRouter } from "./moderationReminders/routes";
import { createModerationReminderRepository } from "./moderationReminders/repositoryFactory";
import { createSeoRouter } from "./seo/routes";
import { createSubscriptionsRouter } from "./subscriptions/routes";
import { createCategorySubscriptionRepository } from "./subscriptions/repositoryFactory";
import { createUploadedAssetRouter, createUploadRouter } from "./uploads/routes";
import { registerStatic } from "./static";
import { createRequestRateLimiter, enforceRequestRateLimit } from "./security/rateLimiter";
import { enforceHttps, preventPrivateCaching, securityHeaders } from "./security/headers";
import { requestLogging } from "./security/logging";

export const apiMutationPolicy = {
  action: "api-mutation",
  ip: { max: 120, windowMs: 15 * 60 * 1000 },
  actor: { max: 240, windowMs: 15 * 60 * 1000 }
};

export const createApp = () => {
  const app = express();
  const authRepository = createAuthRepository();
  const requestRateLimiter = createRequestRateLimiter(authRepository);

  app.disable("x-powered-by");

  // Compresses every response (API JSON, SSR HTML, robots.txt/sitemap.xml, static assets) that
  // negotiates it via Accept-Encoding. Already-compressed content (uploaded WebP images) is left
  // alone by the middleware's own default filter, which skips non-compressible content types.
  app.use(compression());
  // The container is directly exposed by default. A deployment behind a known reverse proxy must
  // opt in with TRUST_PROXY_HOPS; arbitrary X-Forwarded-For values are never trusted.
  app.set("trust proxy", getTrustedProxyHops());
  app.use(enforceHttps);
  app.use(securityHeaders);
  app.use(express.json({ limit: "128kb" }));
  app.use(createAuthenticationMiddleware(authRepository));
  app.use(csrfProtection);
  app.use(preventPrivateCaching);

  app.use("/api", async (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      next();
      return;
    }
    if (await enforceRequestRateLimit(requestRateLimiter, req, res, apiMutationPolicy)) next();
  });

  app.use(requestLogging);

  const eventRepository = createEventRepository();
  const categorySubscriptionRepository = createCategorySubscriptionRepository();
  const moderationReminderRepository = createModerationReminderRepository();
  const communeRepository = createCommuneRepository();
  app.use("/api", createAuthRouter(authRepository));
  app.use("/api", createEventRouter(eventRepository, authRepository, categorySubscriptionRepository));
  app.use("/api/public", createPublicEventsRouter(eventRepository));
  app.use("/api", createGeocodingRouter(authRepository));
  app.use("/api", createCommunesRouter(communeRepository));
  app.use("/api", createUploadRouter(authRepository));
  app.use("/api", createModerationReminderRouter(eventRepository, moderationReminderRepository, authRepository));
  app.use("/uploads", createUploadedAssetRouter());

  const adminRepository = createAdminRepository();
  app.use("/api/admin", createAdminRouter(adminRepository, authRepository));
  app.use("/api/categories", createCategoriesRouter(adminRepository));
  app.use("/api/audiences", createAudiencesRouter(adminRepository));
  app.use("/api/settings", createPublicSettingsRouter(adminRepository));
  app.use("/api", createContactRouter(adminRepository, authRepository));
  app.use("/api/subscriptions", createSubscriptionsRouter(categorySubscriptionRepository, adminRepository));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(createSeoRouter(eventRepository));

  if (process.env.NODE_ENV !== "test") {
    registerStatic(app, eventRepository);
  }

  return app;
};
