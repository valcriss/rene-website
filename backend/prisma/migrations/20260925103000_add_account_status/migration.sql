CREATE TYPE "AccountStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

ALTER TABLE "User"
  ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "User"
SET "accountStatus" = 'INVITED'
WHERE "emailVerifiedAt" IS NULL;
