import express from "express";
import { createAdminRouter } from "./admin/routes";
import { createInMemoryAdminRepository } from "./admin/inMemoryRepository";
import { createEventRouter } from "./events/routes";
import { createEventRepository } from "./events/repositoryFactory";
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

  const adminRepository = createInMemoryAdminRepository();
  app.use("/api/admin", createAdminRouter(adminRepository));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV === "production") {
    registerStatic(app);
  }

  return app;
};
