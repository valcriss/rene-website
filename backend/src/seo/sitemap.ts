import { EventRepository } from "../events/repository";

// Public, static top-level routes with no dynamic data — kept in sync with the public route list
// in backend/src/static.ts (KNOWN_STATIC_ROUTES).
const STATIC_PUBLIC_PATHS = ["/", "/contact", "/mentions-legales"];

// Paths with no SEO value and/or that must never be indexed — kept in sync with static.ts's
// NOINDEX_ROUTES and isBackofficeRoute.
const DISALLOWED_PATHS = ["/backoffice", "/login", "/signup", "/forgot-password", "/reset-password"];

export const buildRobotsTxt = (siteUrl: string): string => {
  const lines = ["User-agent: *", ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`), "", `Sitemap: ${siteUrl}/sitemap.xml`];
  return `${lines.join("\n")}\n`;
};

const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const buildUrlEntry = (loc: string, lastmod?: string): string =>
  [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`, lastmod ? `    <lastmod>${lastmod}</lastmod>` : null, `  </url>`]
    .filter((line): line is string => line !== null)
    .join("\n");

// An event is only worth publishing to the sitemap once it is both published and not archived —
// the same visibility rule the public API and SSR routing already enforce (see
// docs/seo-http-status-policy.md), and only once it has a canonical slug to link to.
const isSitemapEligible = (event: { status: string; archivedAt: string | null; slug: string | null }) =>
  event.status === "PUBLISHED" && !event.archivedAt && Boolean(event.slug);

export const buildSitemapXml = async (repo: EventRepository, siteUrl: string): Promise<string> => {
  const events = await repo.list();

  const staticEntries = STATIC_PUBLIC_PATHS.map((path) => buildUrlEntry(`${siteUrl}${path}`));
  const eventEntries = events
    .filter(isSitemapEligible)
    .map((event) => buildUrlEntry(`${siteUrl}/evenements/${event.slug}`, event.updatedAt));

  const entries = [...staticEntries, ...eventEntries].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
};
