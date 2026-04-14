CREATE TABLE "Audience" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Audience" ("id", "name", "createdAt", "updatedAt") VALUES
  ('all', 'Tous publics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('children', 'Enfants', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('teens', 'Adolescents', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('adults', 'Adultes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seniors', 'Seniors', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Event" ADD COLUMN "audienceId" TEXT;
ALTER TABLE "EventRevision" ADD COLUMN "audienceId" TEXT;

UPDATE "Event" SET "audienceId" = 'all' WHERE "audienceId" IS NULL;
UPDATE "EventRevision" SET "audienceId" = 'all' WHERE "audienceId" IS NULL;

ALTER TABLE "Event" ALTER COLUMN "audienceId" SET NOT NULL;
ALTER TABLE "EventRevision" ALTER COLUMN "audienceId" SET NOT NULL;

CREATE INDEX "Event_audienceId_idx" ON "Event"("audienceId");
CREATE INDEX "EventRevision_audienceId_idx" ON "EventRevision"("audienceId");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_audienceId_fkey"
FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventRevision"
ADD CONSTRAINT "EventRevision_audienceId_fkey"
FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;