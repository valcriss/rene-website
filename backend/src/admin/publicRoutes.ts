import { Router } from "express";
import { AdminRepository } from "./repository";
import { getAdminSettings } from "./service";

export const createPublicSettingsRouter = (repo: AdminRepository) => {
  const router = Router();

  router.get("/", async (_req, res) => {
    const settings = await getAdminSettings(repo);
    res.json({
      homepageIntro: settings.homepageIntro,
      homepageSubtitle: settings.homepageSubtitle
    });
  });

  return router;
};
