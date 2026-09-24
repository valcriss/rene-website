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

      if (!isNonEmptyString(city)) {
        res.status(400).json({ errors: ["La ville est requise."] });
        return;
      }

      const result = await geocodeEventLocation({
        address: isNonEmptyString(address) ? (address as string) : null,
        postalCode: isNonEmptyString(postalCode) ? (postalCode as string) : null,
        city: city as string,
        venueName: isNonEmptyString(venueName) ? (venueName as string) : null
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
