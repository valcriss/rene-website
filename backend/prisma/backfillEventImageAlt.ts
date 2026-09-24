import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// One-off migration companion for 20260924190000_add_event_seo_fields (issue #55): that migration
// only adds the imageAlt/seoTitleOverride/seoDescriptionOverride columns, it does not populate
// imageAlt for events created before it ran (going forward, the editor UI collects it and the
// backend requires it whenever an event with an image is submitted for moderation). Without a
// default, every pre-existing event with an image would suddenly be unable to receive further
// edits until someone manually adds alt text. Falling back to the event's own title is a safe,
// non-empty, reasonably descriptive default — editors can refine it later from the editor.
//
//   npx ts-node prisma/backfillEventImageAlt.ts
//
// Idempotent — only rows with an image and no imageAlt yet are touched — so it is safe to re-run.
const backfill = async () => {
  const [eventCount, revisionCount] = await Promise.all([
    prisma.event.count({ where: { image: { not: null }, imageAlt: null } }),
    prisma.eventRevision.count({ where: { image: { not: null }, imageAlt: null } })
  ]);

  // eslint-disable-next-line no-console
  console.log(`${eventCount} événement(s) et ${revisionCount} révision(s) avec une image sans texte alternatif.`);

  await prisma.$executeRaw`UPDATE "Event" SET "imageAlt" = "title" WHERE "image" IS NOT NULL AND "imageAlt" IS NULL`;
  await prisma.$executeRaw`UPDATE "EventRevision" SET "imageAlt" = "title" WHERE "image" IS NOT NULL AND "imageAlt" IS NULL`;

  // eslint-disable-next-line no-console
  console.log("Backfill terminé.");
};

backfill()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Échec du backfill des textes alternatifs", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
