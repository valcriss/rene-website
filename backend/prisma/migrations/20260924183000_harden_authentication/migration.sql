-- Authentication identifiers are case-insensitive within R3ne. Existing values are
-- canonicalised before adding the database-level uniqueness guard.
UPDATE "User" SET "email" = LOWER(BTRIM("email"));
CREATE UNIQUE INDEX "User_email_normalized_key" ON "User" (LOWER("email"));
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "User" SET "emailVerifiedAt" = "createdAt";

CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE UNIQUE INDEX "EmailVerificationToken_userId_key" ON "EmailVerificationToken"("userId");
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stored in PostgreSQL, this limiter is shared by every API replica. Keys contain a
-- SHA-256 digest of the IP/account identifier, never the identifier itself.
CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);
