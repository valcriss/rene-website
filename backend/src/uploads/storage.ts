import fs from "node:fs";
import path from "node:path";

const DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export const getUploadDir = () => {
  const custom = process.env.UPLOAD_DIR?.trim();
  return custom && custom.length > 0 ? custom : DEFAULT_UPLOAD_DIR;
};

export const ensureUploadDir = () => {
  const dir = getUploadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const buildUploadUrl = (filename: string) => `/uploads/${filename}`;

export const isLocalUpload = (value: string) => value.startsWith("/uploads/");

export const resolveUploadPath = (value: string) => {
  const filename = path.basename(value);
  return path.join(getUploadDir(), filename);
};

export const deleteUploadIfLocal = async (value: string) => {
  if (!isLocalUpload(value)) return;
  const filePath = resolveUploadPath(value);
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // ignore missing files
  }
};
