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
import { createContactRouter } from "./contact/routes";
import { createEventRouter } from "./events/routes";
import { createPublicEventsRouter } from "./events/publicRoutes";
import { createEventRepository } from "./events/repositoryFactory";
import { createGeocodingRouter } from "./geocoding/routes";
import { createModerationReminderRouter } from "./moderationReminders/routes";
import { createModerationReminderRepository } from "./moderationReminders/repositoryFactory";
import { createSubscriptionsRouter } from "./subscriptions/routes";
import { createCategorySubscriptionRepository } from "./subscriptions/repositoryFactory";
import { createUploadedAssetRouter, createUploadRouter } from "./uploads/routes";
import { registerStatic } from "./static";

export const createApp = () => {
  const app = express();
  const authRepository = createAuthRepository();

  app.use(express.json());
  app.use(createAuthenticationMiddleware(authRepository));
  app.use(csrfProtection);

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      // eslint-disable-next-line no-console
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  const eventRepository = createEventRepository();
  const categorySubscriptionRepository = createCategorySubscriptionRepository();
  const moderationReminderRepository = createModerationReminderRepository();
  const communeRepository = createCommuneRepository();
  app.use("/api", createAuthRouter(authRepository));
  app.use("/api", createEventRouter(eventRepository, authRepository, categorySubscriptionRepository));
  app.use("/api/public", createPublicEventsRouter(eventRepository));
  app.use("/api", createGeocodingRouter());
  app.use("/api", createCommunesRouter(communeRepository));
  app.use("/api", createUploadRouter());
  app.use("/api", createModerationReminderRouter(eventRepository, moderationReminderRepository, authRepository));
  app.use("/uploads", createUploadedAssetRouter());

  const adminRepository = createAdminRepository();
  app.use("/api/admin", createAdminRouter(adminRepository, authRepository));
  app.use("/api/categories", createCategoriesRouter(adminRepository));
  app.use("/api/audiences", createAudiencesRouter(adminRepository));
  app.use("/api/settings", createPublicSettingsRouter(adminRepository));
  app.use("/api", createContactRouter(adminRepository));
  app.use("/api/subscriptions", createSubscriptionsRouter(categorySubscriptionRepository, adminRepository));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "test") {
    registerStatic(app, eventRepository);
  }

  return app;
};
