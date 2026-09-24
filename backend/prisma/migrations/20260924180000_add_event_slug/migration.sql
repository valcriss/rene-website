ALTER TABLE "Event" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

CREATE TABLE "EventSlugRedirect" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventSlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventSlugRedirect_slug_key" ON "EventSlugRedirect"("slug");
CREATE INDEX "EventSlugRedirect_eventId_idx" ON "EventSlugRedirect"("eventId");
ALTER TABLE "EventSlugRedirect" ADD CONSTRAINT "EventSlugRedirect_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
