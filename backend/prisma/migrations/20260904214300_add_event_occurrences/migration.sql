-- CreateTable
CREATE TABLE "EventOccurrence" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "venueName" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geolocationPrecision" "GeolocationPrecision" NOT NULL DEFAULT 'UNRESOLVED',
    "eventStartAt" TIMESTAMP(3),
    "eventEndAt" TIMESTAMP(3),
    "allDay" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRevisionOccurrence" (
    "id" UUID NOT NULL,
    "eventRevisionId" UUID NOT NULL,
    "venueName" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geolocationPrecision" "GeolocationPrecision" NOT NULL DEFAULT 'UNRESOLVED',
    "eventStartAt" TIMESTAMP(3),
    "eventEndAt" TIMESTAMP(3),
    "allDay" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRevisionOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventOccurrence_eventId_idx" ON "EventOccurrence"("eventId");

-- CreateIndex
CREATE INDEX "EventOccurrence_eventStartAt_idx" ON "EventOccurrence"("eventStartAt");

-- CreateIndex
CREATE INDEX "EventRevisionOccurrence_eventRevisionId_idx" ON "EventRevisionOccurrence"("eventRevisionId");

-- CreateIndex
CREATE INDEX "EventRevisionOccurrence_eventStartAt_idx" ON "EventRevisionOccurrence"("eventStartAt");

-- AddForeignKey
ALTER TABLE "EventOccurrence" ADD CONSTRAINT "EventOccurrence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRevisionOccurrence" ADD CONSTRAINT "EventRevisionOccurrence_eventRevisionId_fkey" FOREIGN KEY ("eventRevisionId") REFERENCES "EventRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: carry over each existing Event's venue/date fields into a single occurrence,
-- so previously saved events keep their location/date after the columns move off Event.
-- Events with no venue/date info at all (title-only drafts) get zero occurrences, matching the
-- new model where an event with nothing to say about "when/where" simply has an empty list.
INSERT INTO "EventOccurrence" ("id", "eventId", "venueName", "address", "postalCode", "city", "latitude", "longitude", "geolocationPrecision", "eventStartAt", "eventEndAt", "allDay", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "venueName", "address", "postalCode", "city", "latitude", "longitude", "geolocationPrecision", "eventStartAt", "eventEndAt", "allDay", "createdAt", "updatedAt"
FROM "Event"
WHERE "venueName" IS NOT NULL OR "address" IS NOT NULL OR "postalCode" IS NOT NULL OR "city" IS NOT NULL
   OR "latitude" IS NOT NULL OR "longitude" IS NOT NULL OR "eventStartAt" IS NOT NULL OR "eventEndAt" IS NOT NULL
   OR "allDay" IS NOT NULL;

-- DataMigration: same carry-over for pending revisions of published events.
INSERT INTO "EventRevisionOccurrence" ("id", "eventRevisionId", "venueName", "address", "postalCode", "city", "latitude", "longitude", "geolocationPrecision", "eventStartAt", "eventEndAt", "allDay", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "venueName", "address", "postalCode", "city", "latitude", "longitude", "geolocationPrecision", "eventStartAt", "eventEndAt", "allDay", "createdAt", "updatedAt"
FROM "EventRevision"
WHERE "venueName" IS NOT NULL OR "address" IS NOT NULL OR "postalCode" IS NOT NULL OR "city" IS NOT NULL
   OR "latitude" IS NOT NULL OR "longitude" IS NOT NULL OR "eventStartAt" IS NOT NULL OR "eventEndAt" IS NOT NULL
   OR "allDay" IS NOT NULL;

-- DropIndex
DROP INDEX "Event_eventStartAt_idx";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "address",
DROP COLUMN "allDay",
DROP COLUMN "city",
DROP COLUMN "eventEndAt",
DROP COLUMN "eventStartAt",
DROP COLUMN "geolocationPrecision",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "postalCode",
DROP COLUMN "venueName";

-- AlterTable
ALTER TABLE "EventRevision" DROP COLUMN "address",
DROP COLUMN "allDay",
DROP COLUMN "city",
DROP COLUMN "eventEndAt",
DROP COLUMN "eventStartAt",
DROP COLUMN "geolocationPrecision",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "postalCode",
DROP COLUMN "venueName";
