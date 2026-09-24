ALTER TABLE "Event" ADD COLUMN "imageAlt" TEXT;
ALTER TABLE "Event" ADD COLUMN "seoTitleOverride" TEXT;
ALTER TABLE "Event" ADD COLUMN "seoDescriptionOverride" TEXT;

ALTER TABLE "EventRevision" ADD COLUMN "imageAlt" TEXT;
ALTER TABLE "EventRevision" ADD COLUMN "seoTitleOverride" TEXT;
ALTER TABLE "EventRevision" ADD COLUMN "seoDescriptionOverride" TEXT;
