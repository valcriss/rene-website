import { Router } from "express";
import { EventRepository } from "../events/repository";
import { resolveSiteUrl } from "../ssr";
import { buildRobotsTxt, buildSitemapXml } from "./sitemap";

export const createSeoRouter = (repo: EventRepository) => {
  const router = Router();

  router.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(buildRobotsTxt(resolveSiteUrl()));
  });

  router.get("/sitemap.xml", async (_req, res) => {
    try {
      const xml = await buildSitemapXml(repo, resolveSiteUrl());
      res.type("application/xml").send(xml);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Sitemap generation error", error);
      res.status(500).type("text/plain").send("Erreur interne du serveur.");
    }
  });

  return router;
};
