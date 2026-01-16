-- Create Category table
CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Seed categories from existing events
INSERT INTO "Category" ("id", "name", "createdAt", "updatedAt")
SELECT DISTINCT "categoryId", "categoryId", NOW(), NOW()
FROM "Event"
WHERE "categoryId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- Add relation between Event and Category
ALTER TABLE "Event"
ADD CONSTRAINT "Event_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index for faster filtering
CREATE INDEX "Event_categoryId_idx" ON "Event"("categoryId");
