-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "contactEmail" TEXT NOT NULL DEFAULT 'contact@rene-website.test',
    "contactPhone" TEXT NOT NULL DEFAULT '0102030405',
    "homepageIntro" TEXT NOT NULL DEFAULT 'Plateforme culturelle de Descartes.',
    "homepageSubtitle" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- SeedDefaultSiteSetting
INSERT INTO "SiteSetting" ("id", "contactEmail", "contactPhone", "homepageIntro", "homepageSubtitle", "updatedAt")
VALUES ('default', 'contact@rene-website.test', '0102030405', 'Plateforme culturelle de Descartes.', '', CURRENT_TIMESTAMP);
