import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const STORED_UPLOAD_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;
const LOCAL_UPLOAD_PATTERN = /\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp)/g;
const PENDING_DIRECTORY = "pending";
const ASSET_DIRECTORY = "assets";

export const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

export const getUploadDir = () => {
  const custom = process.env.UPLOAD_DIR?.trim();
  return custom && custom.length > 0 ? path.resolve(custom) : DEFAULT_UPLOAD_DIR;
};

export const ensureUploadDir = () => {
  const dir = getUploadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const ensureSubdirectory = (name: string) => {
  const dir = path.join(ensureUploadDir(), name);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const getPendingUploadDir = () => ensureSubdirectory(PENDING_DIRECTORY);

export const getAssetUploadDir = () => ensureSubdirectory(ASSET_DIRECTORY);

export const buildUploadUrl = (filename: string) => `/uploads/${filename}`;

export const isStoredUploadFilename = (filename: string) => STORED_UPLOAD_PATTERN.test(filename);

export const persistProcessedUpload = async (contents: Buffer) => {
  const filename = `${crypto.randomUUID()}.webp`;
  const filePath = path.join(getPendingUploadDir(), filename);
  await fs.promises.writeFile(filePath, contents, { flag: "wx", mode: 0o600 });
  return filename;
};

export const isLocalUpload = (value: string) => value.startsWith("/uploads/");

export const resolveUploadPath = (value: string) => {
  const filename = path.basename(value);
  return path.join(getAssetUploadDir(), filename);
};

const resolvePendingUploadPath = (value: string) => path.join(getPendingUploadDir(), path.basename(value));

export const readStoredUpload = async (filename: string) => {
  try {
    return await fs.promises.readFile(resolveUploadPath(filename));
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") {
      throw error;
    }
  }

  return fs.promises.readFile(resolvePendingUploadPath(filename));
};

const extractLocalUploadFilenames = (values: Array<string | null | undefined>) => {
  const filenames = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const match of value.matchAll(LOCAL_UPLOAD_PATTERN)) {
      filenames.add(match[1]);
    }
  }
  return [...filenames];
};

export const claimLocalUploads = async (values: Array<string | null | undefined>) => {
  const claimed: string[] = [];
  for (const filename of extractLocalUploadFilenames(values)) {
    try {
      await fs.promises.rename(resolvePendingUploadPath(filename), resolveUploadPath(filename));
      claimed.push(filename);
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") {
        throw error;
      }
    }
  }
  return claimed;
};

export const releaseClaimedUploads = async (filenames: string[]) => {
  for (const filename of filenames) {
    try {
      await fs.promises.rename(resolveUploadPath(filename), resolvePendingUploadPath(filename));
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") {
        throw error;
      }
    }
  }
};

export const cleanupExpiredPendingUploads = async (now = Date.now()) => {
  const pendingDir = getPendingUploadDir();
  const entries = await fs.promises.readdir(pendingDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !isStoredUploadFilename(entry.name)) continue;
    const filePath = path.join(pendingDir, entry.name);
    const stat = await fs.promises.stat(filePath);
    if (now - stat.mtimeMs > PENDING_UPLOAD_TTL_MS) {
      await fs.promises.unlink(filePath);
    }
  }
};

export const deleteUploadIfLocal = async (value: string | null) => {
  if (!value || !isLocalUpload(value)) return;
  for (const filePath of [resolveUploadPath(value), resolvePendingUploadPath(value)]) {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // ignore missing files
    }
  }
};

export const deleteLocalUploads = async (values: Array<string | null | undefined>) => {
  for (const filename of extractLocalUploadFilenames(values)) {
    await deleteUploadIfLocal(buildUploadUrl(filename));
  }
};

export const deleteUnreferencedLocalUploads = async (
  previousValues: Array<string | null | undefined>,
  currentValues: Array<string | null | undefined>
) => {
  const current = new Set(extractLocalUploadFilenames(currentValues));
  const removed = extractLocalUploadFilenames(previousValues).filter((filename) => !current.has(filename));
  await deleteLocalUploads(removed.map(buildUploadUrl));
};
