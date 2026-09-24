-- CreateEnum
CREATE TYPE "ModerationReminderTarget" AS ENUM ('EVENT', 'REVISION');

-- CreateTable
CREATE TABLE "CategoryUnsubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryUnsubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationReminder" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "target" "ModerationReminderTarget" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryUnsubscription_userId_categoryId_key" ON "CategoryUnsubscription"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationReminder_eventId_target_key" ON "ModerationReminder"("eventId", "target");

-- AddForeignKey
ALTER TABLE "CategoryUnsubscription" ADD CONSTRAINT "CategoryUnsubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryUnsubscription" ADD CONSTRAINT "CategoryUnsubscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReminder" ADD CONSTRAINT "ModerationReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
