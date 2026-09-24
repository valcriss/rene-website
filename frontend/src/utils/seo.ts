// Used whenever an event has no image of its own, or a page has no natural share image at
// all. Kept as a plain site-relative path; toAbsoluteUrl resolves it against SITE_URL.
export const DEFAULT_OG_IMAGE_PATH = "/logo.svg";

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

// Open Graph/Twitter Card/canonical URLs must always be absolute. `siteUrl` comes from the
// SITE_URL env var (server) or window.location.origin (client, see useSiteUrl); an already
// absolute URL (e.g. a user-supplied websiteUrl) is returned unchanged.
export const toAbsoluteUrl = (siteUrl: string, pathOrUrl: string): string => {
  if (ABSOLUTE_URL_PATTERN.test(pathOrUrl)) {
    return pathOrUrl;
  }
  if (!siteUrl) {
    return pathOrUrl;
  }
  try {
    return new URL(pathOrUrl, siteUrl).toString();
  } catch {
    return pathOrUrl;
  }
};

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'"
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (match) => HTML_ENTITIES[match] ?? match);

// Builds a safe, plain-text meta description from rich HTML content: strips tags first (so
// truncation can never leave a dangling/unclosed tag), decodes entities, collapses whitespace,
// and truncates on a word boundary rather than mid-word.
export const buildPlainTextDescription = (html: string | null | undefined, maxLength = 160): string => {
  if (!html) {
    return "";
  }

  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  const collapsed = decoded.replace(/\s+/g, " ").trim();

  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  const truncated = collapsed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const safe = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe}…`;
};
