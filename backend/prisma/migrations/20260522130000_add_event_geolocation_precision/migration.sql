-- CreateEnum
CREATE TYPE "GeolocationPrecision" AS ENUM ('EXACT', 'APPROXIMATE', 'UNRESOLVED');

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "geolocationPrecision" "GeolocationPrecision" NOT NULL DEFAULT 'UNRESOLVED';

-- AlterTable
ALTER TABLE "EventRevision"
ADD COLUMN "geolocationPrecision" "GeolocationPrecision" NOT NULL DEFAULT 'UNRESOLVED';

-- Backfill historical records with coordinates as exact, unresolved otherwise.
UPDATE "Event"
SET "geolocationPrecision" = CASE
  WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL THEN 'EXACT'::"GeolocationPrecision"
  ELSE 'UNRESOLVED'::"GeolocationPrecision"
END;

UPDATE "EventRevision"
SET "geolocationPrecision" = CASE
  WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL THEN 'EXACT'::"GeolocationPrecision"
  ELSE 'UNRESOLVED'::"GeolocationPrecision"
END;