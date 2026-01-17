-- Add createdByUserId to Event
ALTER TABLE "Event"
ADD COLUMN "createdByUserId" UUID;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Event_createdByUserId_idx" ON "Event"("createdByUserId");
