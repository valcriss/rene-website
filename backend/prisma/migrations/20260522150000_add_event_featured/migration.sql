ALTER TABLE "Event"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Event_featured_idx" ON "Event"("featured");

ALTER TABLE "EventRevision"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
