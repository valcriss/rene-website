import { Request, Response, Router } from "express";
import { AuthRepository } from "../auth/repository";
import { createRequestRateLimiter, enforceRequestRateLimit } from "../security/rateLimiter";
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

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const maximumGeocodingFieldLength = 160;
const geocodingRateLimitPolicy = {
  action: "geocoding",
  ip: { max: 60, windowMs: 15 * 60 * 1000 },
  actor: { max: 120, windowMs: 15 * 60 * 1000 }
};

const isValidGeocodingString = (value: unknown): value is string =>
  isNonEmptyString(value) && value.trim().length <= maximumGeocodingFieldLength;

const isValidOptionalGeocodingString = (value: unknown) =>
  value === undefined || (typeof value === "string" && value.trim().length <= maximumGeocodingFieldLength);

export const createGeocodingRouter = (rateLimitRepository?: Pick<AuthRepository, "consumeRateLimit">) => {
  const router = Router();
  const rateLimiter = createRequestRateLimiter(rateLimitRepository);

  router.get(
    "/geocoding",
    withErrorHandling(async (req, res) => {
      const { address, postalCode, city, venueName } = req.query;

      if (!isValidGeocodingString(city)) {
        res.status(400).json({ errors: ["La ville est requise et doit contenir au plus 160 caractères."] });
        return;
      }
      if (![address, postalCode, venueName].every(isValidOptionalGeocodingString)) {
        res.status(400).json({ errors: ["Les champs de géocodage doivent contenir au plus 160 caractères."] });
        return;
      }
      if (!(await enforceRequestRateLimit(rateLimiter, req, res, geocodingRateLimitPolicy))) return;

      const result = await geocodeEventLocation({
        address: isValidGeocodingString(address) ? (address as string) : null,
        postalCode: isValidGeocodingString(postalCode) ? (postalCode as string) : null,
        city: city as string,
        venueName: isValidGeocodingString(venueName) ? (venueName as string) : null
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
