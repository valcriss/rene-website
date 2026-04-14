-- CreateEnum
CREATE TYPE "EventRevisionStatus" AS ENUM ('PENDING', 'REJECTED');

-- CreateTable
CREATE TABLE "EventRevision" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdByUserId" UUID,
    "categoryId" TEXT NOT NULL,
    "eventStartAt" TIMESTAMP(3) NOT NULL,
    "eventEndAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL,
    "venueName" TEXT NOT NULL,
    "address" TEXT,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "organizerName" TEXT NOT NULL,
    "organizerUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "ticketUrl" TEXT,
    "websiteUrl" TEXT,
    "status" "EventRevisionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRevision_eventId_key" ON "EventRevision"("eventId");

-- CreateIndex
CREATE INDEX "EventRevision_status_idx" ON "EventRevision"("status");

-- CreateIndex
CREATE INDEX "EventRevision_categoryId_idx" ON "EventRevision"("categoryId");

-- CreateIndex
CREATE INDEX "EventRevision_createdByUserId_idx" ON "EventRevision"("createdByUserId");

-- AddForeignKey
ALTER TABLE "EventRevision" ADD CONSTRAINT "EventRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRevision" ADD CONSTRAINT "EventRevision_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRevision" ADD CONSTRAINT "EventRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;