import { Request, Response, Router } from "express";
import { geocodeEventLocation } from "./photon";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const withErrorHandling = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Geocoding API error", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

const isNonEmptyString = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export const createGeocodingRouter = () => {
  const router = Router();

  router.get(
    "/geocoding",
    withErrorHandling(async (req, res) => {
      const { address, postalCode, city, venueName } = req.query;
      const errors: string[] = [];

      if (!isNonEmptyString(address)) errors.push("L'adresse est requise.");
      if (!isNonEmptyString(postalCode)) errors.push("Le code postal est requis.");
      if (!isNonEmptyString(city)) errors.push("La ville est requise.");
      if (!isNonEmptyString(venueName)) errors.push("Le lieu est requis.");

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const result = await geocodeEventLocation({
        address: address as string,
        postalCode: postalCode as string,
        city: city as string,
        venueName: venueName as string
      });

      if (!result) {
        res.status(404).json({ errors: ["Adresse introuvable."] });
        return;
      }

      res.json(result);
    })
  );

  return router;
};
