import { Router } from "express";
import { AdminRepository } from "../admin/repository";
import { listAdminAudiences } from "../admin/service";

export const createAudiencesRouter = (repo: AdminRepository) => {
  const router = Router();

  router.get("/", async (_req, res) => {
    const audiences = await listAdminAudiences(repo);
    res.json(audiences);
  });

  return router;
};