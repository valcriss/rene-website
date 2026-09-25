import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { getUploadDir, isStoredUploadFilename, buildUploadUrl, claimLocalUploads } from "../src/uploads/storage";
import { processAndPersistUpload } from "../src/uploads/processor";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const UPLOAD_PATH_PREFIX = "/uploads/";

const mimeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

const extractLegacyFilename = (value: string | null): string | null => {
  if (!value || !value.startsWith(UPLOAD_PATH_PREFIX)) return null;
  const filename = value.slice(UPLOAD_PATH_PREFIX.length);
  return isStoredUploadFilename(filename) ? null : filename;
};

// One-off migration companion for the pre-existing image-upload hardening ("fix(security): harden
// image uploads"): that change restricted served uploads to a strict <uuid>.webp naming pattern,
// but never migrated files that had already been uploaded under the previous
// <timestamp>-<uuid>.<ext> naming — those became permanently unservable (404) even though the
// original file is still sitting on disk. This re-encodes each one through the same pipeline a
// fresh upload goes through (processAndPersistUpload: strips EXIF, caps width, encodes to webp)
// and repoints every Event/EventRevision row that referenced it at the new URL.
//
//   npx ts-node prisma/backfillLegacyUploads.ts
//
// Idempotent: rows already pointing at a <uuid>.webp URL are left untouched, and re-running after
// a partial failure only reprocesses filenames that still resolve to a legacy row. Original files
// are never deleted — remove them manually once you've confirmed the new URLs render correctly.
// Formats outside jpg/jpeg/png/webp (e.g. avif) aren't supported by the upload pipeline and are
// skipped with a warning; those need manual conversion or a fresh re-upload.
const backfill = async () => {
  const uploadDir = getUploadDir();
  const converted = new Map<string, string | null>();

  const convert = async (filename: string): Promise<string | null> => {
    if (converted.has(filename)) return converted.get(filename) ?? null;

    const extension = filename.split(".").pop()?.toLowerCase() ?? "";
    const mimetype = mimeByExtension[extension];
    if (!mimetype) {
      // eslint-disable-next-line no-console
      console.warn(`  ${filename}: format ".${extension}" non pris en charge, ignoré (à traiter manuellement).`);
      converted.set(filename, null);
      return null;
    }

    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(path.join(uploadDir, filename));
    } catch {
      // eslint-disable-next-line no-console
      console.warn(`  ${filename}: fichier introuvable sur le disque, ignoré.`);
      converted.set(filename, null);
      return null;
    }

    try {
      const newFilename = await processAndPersistUpload({ buffer, mimetype, originalname: `legacy.${extension}` });
      const url = buildUploadUrl(newFilename);
      await claimLocalUploads([url]);
      // eslint-disable-next-line no-console
      console.log(`  ${filename} -> ${newFilename}`);
      converted.set(filename, url);
      return url;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`  ${filename}: échec de la conversion (${error instanceof Error ? error.message : String(error)}), ignoré.`);
      converted.set(filename, null);
      return null;
    }
  };

  const [events, revisions] = await Promise.all([
    prisma.event.findMany({ where: { image: { not: null } }, select: { id: true, image: true } }),
    prisma.eventRevision.findMany({ where: { image: { not: null } }, select: { id: true, image: true } })
  ]);

  const legacyEvents = events.filter((event) => extractLegacyFilename(event.image) !== null);
  const legacyRevisions = revisions.filter((revision) => extractLegacyFilename(revision.image) !== null);

  // eslint-disable-next-line no-console
  console.log(`${legacyEvents.length} événement(s) et ${legacyRevisions.length} révision(s) avec une image au format hérité.`);

  for (const event of legacyEvents) {
    const filename = extractLegacyFilename(event.image)!;
    const url = await convert(filename);
    if (url) {
      await prisma.event.update({ where: { id: event.id }, data: { image: url } });
    }
  }

  for (const revision of legacyRevisions) {
    const filename = extractLegacyFilename(revision.image)!;
    const url = await convert(filename);
    if (url) {
      await prisma.eventRevision.update({ where: { id: revision.id }, data: { image: url } });
    }
  }

  // eslint-disable-next-line no-console
  console.log("Backfill terminé.");
};

backfill()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Échec du backfill des images héritées", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
