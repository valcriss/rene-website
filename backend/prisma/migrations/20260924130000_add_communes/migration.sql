-- CreateTable
CREATE TABLE "Commune" (
    "id" UUID NOT NULL,
    "codeInsee" TEXT NOT NULL,
    "codePostal" TEXT NOT NULL,
    "nomCommune" TEXT NOT NULL,
    "libelleAcheminement" TEXT NOT NULL,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Commune_codePostal_idx" ON "Commune"("codePostal");

-- CreateIndex
CREATE INDEX "Commune_nomCommune_idx" ON "Commune"("nomCommune");

-- CreateIndex
CREATE UNIQUE INDEX "Commune_codeInsee_codePostal_key" ON "Commune"("codeInsee", "codePostal");
