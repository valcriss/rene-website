import express from "express";
import { createAdminRouter } from "./admin/routes";
import { createAdminRepository } from "./admin/repositoryFactory";
import { createCategoriesRouter } from "./categories/routes";
import { createEventRouter } from "./events/routes";
import { createEventRepository } from "./events/repositoryFactory";
import { createGeocodingRouter } from "./geocoding/routes";
import { createUploadRouter } from "./uploads/routes";
import { getUploadDir } from "./uploads/storage";
import { registerStatic } from "./static";

export const createApp = () => {
  const app = express();

  app.use(express.json());

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
  app.use("/api", createEventRouter(eventRepository));
  app.use("/api", createGeocodingRouter());
  app.use("/api", createUploadRouter());
  app.use("/uploads", express.static(getUploadDir()));

  const adminRepository = createAdminRepository();
  app.use("/api/admin", createAdminRouter(adminRepository));
  app.use("/api/categories", createCategoriesRouter(adminRepository));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV === "production") {
    registerStatic(app);
  }

  return app;
};
