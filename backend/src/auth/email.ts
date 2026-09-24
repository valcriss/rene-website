import { domainToASCII } from "node:url";

const emailPattern = /^[^\s@]+@[^\s@]+$/;

/**
 * The application treats email addresses as case-insensitive identifiers.  Unicode is
 * normalized before persistence so that each authentication path uses the same key.
 */
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const candidate = value.trim().normalize("NFKC");
  const separator = candidate.lastIndexOf("@");
  if (separator <= 0 || separator !== candidate.indexOf("@")) return null;

  const localPart = candidate.slice(0, separator).toLocaleLowerCase("en-US");
  const asciiDomain = domainToASCII(candidate.slice(separator + 1).toLocaleLowerCase("en-US"));
  const normalized = `${localPart}@${asciiDomain}`;

  return asciiDomain && emailPattern.test(normalized) ? normalized : null;
};
