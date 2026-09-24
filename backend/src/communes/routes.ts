import { Request, Response, Router } from "express";
import { CommuneRepository } from "./repository";
import { searchCommunes } from "./service";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Communes API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

const asOptionalString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

export const createCommunesRouter = (repo: CommuneRepository) => {
  const router = Router();

  router.get(
    "/communes",
    withErrorHandling(async (req, res) => {
      const result = await searchCommunes(repo, {
        postalCode: asOptionalString(req.query.postalCode),
        q: asOptionalString(req.query.q)
      });

      if (!result.ok) {
        res.status(400).json({ errors: result.errors });
        return;
      }

      res.json(result.value);
    })
  );

  return router;
};
