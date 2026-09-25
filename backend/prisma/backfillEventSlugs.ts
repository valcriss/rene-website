import path from "path";
import dotenv from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
import { generateUniqueEventSlug } from "../src/events/slug";
import { createPrismaEventRepository } from "../src/events/prismaRepository";
import type { EventOccurrenceInput } from "../src/events/types";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

type EventWithOccurrences = Prisma.EventGetPayload<{ include: { occurrences: true } }>;

// One-off migration companion for 20260924180000_add_event_slug: that migration only adds the
// `slug` column and the redirect history table, it does not populate slugs for events that were
// already published before it ran (going forward, publishEvent assigns one automatically on
// first publication). Run this script once after deploying the migration:
//
//   npx ts-node prisma/backfillEventSlugs.ts
//
// It is idempotent — events that already have a slug are skipped — so it is safe to re-run.
const backfill = async () => {
  const events: EventWithOccurrences[] = await prisma.event.findMany({
    where: { status: "PUBLISHED", slug: null },
    include: { occurrences: true },
    orderBy: { publishedAt: "asc" }
  });

  // eslint-disable-next-line no-console
  console.log(`${events.length} événement(s) publié(s) sans slug.`);

  const slugRepo = createPrismaEventRepository();

  for (const event of events) {
    const occurrences: EventOccurrenceInput[] = event.occurrences.map((occurrence) => ({
      venueName: occurrence.venueName,
      address: occurrence.address,
      postalCode: occurrence.postalCode,
      city: occurrence.city,
      latitude: occurrence.latitude,
      longitude: occurrence.longitude,
      geolocationPrecision: occurrence.geolocationPrecision,
      eventStartAt: occurrence.eventStartAt ? occurrence.eventStartAt.toISOString() : null,
      eventEndAt: occurrence.eventEndAt ? occurrence.eventEndAt.toISOString() : null,
      allDay: occurrence.allDay
    }));

    const slug = await generateUniqueEventSlug(slugRepo, event.title, occurrences);
    await prisma.event.update({ where: { id: event.id }, data: { slug } });
    // eslint-disable-next-line no-console
    console.log(`  ${event.id} -> ${slug}`);
  }

  // eslint-disable-next-line no-console
  console.log("Backfill terminé.");
};

backfill()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Échec du backfill des slugs", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
