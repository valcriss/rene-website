import sharp from "sharp";
import { cleanupExpiredPendingUploads, persistProcessedUpload } from "./storage";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_PIXELS = 20_000_000;

type SupportedFormat = "jpeg" | "png" | "webp";

type UploadCandidate = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

type ImageFactory = (input: Buffer, options: sharp.SharpOptions) => sharp.Sharp;

const formatByMime: Record<string, SupportedFormat> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp"
};

const formatByExtension: Record<string, SupportedFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp"
};

const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
const pngEnd = Buffer.from("0000000049454e44ae426082", "hex");

export class UploadRejectedError extends Error {
  constructor() {
    super("UPLOAD_REJECTED");
    this.name = "UploadRejectedError";
  }
}

const reject = (): never => {
  throw new UploadRejectedError();
};

export const getDeclaredUploadFormat = (originalname: string, mimetype: string): SupportedFormat | null => {
  const nameMatch = originalname.match(/^[^./\\]+\.(jpe?g|png|webp)$/i);
  if (!nameMatch) {
    return null;
  }

  const extensionFormat = formatByExtension[nameMatch[1].toLowerCase()];
  const mimeFormat = formatByMime[mimetype.toLowerCase()];
  return extensionFormat === mimeFormat ? extensionFormat : null;
};

const hasPngEnvelope = (contents: Buffer) =>
  contents.length >= pngSignature.length + pngEnd.length &&
  contents.subarray(0, pngSignature.length).equals(pngSignature) &&
  contents.subarray(contents.length - pngEnd.length).equals(pngEnd);

const hasJpegEnvelope = (contents: Buffer) =>
  contents.length >= 4 &&
  contents[0] === 0xff &&
  contents[1] === 0xd8 &&
  contents[2] === 0xff &&
  contents[contents.length - 2] === 0xff &&
  contents[contents.length - 1] === 0xd9;

const hasWebpEnvelope = (contents: Buffer) =>
  contents.length >= 12 &&
  contents.subarray(0, 4).toString("ascii") === "RIFF" &&
  contents.subarray(8, 12).toString("ascii") === "WEBP" &&
  contents.readUInt32LE(4) + 8 === contents.length;

const matchesBinaryEnvelope = (contents: Buffer, format: SupportedFormat) => {
  if (format === "png") return hasPngEnvelope(contents);
  if (format === "jpeg") return hasJpegEnvelope(contents);
  return hasWebpEnvelope(contents);
};

export const isDecodedMetadataAllowed = (
  metadata: Pick<sharp.Metadata, "format" | "pages">,
  declaredFormat: SupportedFormat
) => metadata.format === declaredFormat && (metadata.pages ?? 1) === 1;

export const processAndPersistUpload = async (file: UploadCandidate, createImage: ImageFactory = sharp) => {
  const declaredFormat = getDeclaredUploadFormat(file.originalname, file.mimetype);
  if (!declaredFormat || !matchesBinaryEnvelope(file.buffer, declaredFormat)) {
    return reject();
  }

  try {
    const image = createImage(file.buffer, {
      failOn: "error",
      limitInputPixels: MAX_UPLOAD_PIXELS,
      animated: false
    });
    const metadata = await image.metadata();
    if (!isDecodedMetadataAllowed(metadata, declaredFormat)) {
      return reject();
    }

    // Re-encoding strips EXIF/XMP metadata and any unused trailing or active content.
    const sanitized = await image.rotate().webp({ quality: 85, effort: 4 }).toBuffer();
    await cleanupExpiredPendingUploads();
    return persistProcessedUpload(sanitized);
  } catch {
    return reject();
  }
};
