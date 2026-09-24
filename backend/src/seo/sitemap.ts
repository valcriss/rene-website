import { EventRepository } from "../events/repository";
import { getActiveCategoryIds, getActiveCityFacets } from "./agenda";

// Public, static top-level routes with no dynamic data — kept in sync with the public route list
// in backend/src/static.ts (KNOWN_STATIC_ROUTES). /agenda/ce-week-end is evergreen (see
// docs/seo-local-pages.md) so it's always listed, unlike the city/category pages below which are
// only included while they have at least one currently active (published, non-archived) event.
const STATIC_PUBLIC_PATHS = ["/", "/contact", "/mentions-legales", "/agenda/ce-week-end"];

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
  const cityEntries = getActiveCityFacets(events).map((facet) =>
    buildUrlEntry(`${siteUrl}/agenda/ville/${facet.slug}`)
  );
  const categoryEntries = getActiveCategoryIds(events).map((categoryId) =>
    buildUrlEntry(`${siteUrl}/agenda/categorie/${categoryId}`)
  );

  const entries = [...staticEntries, ...eventEntries, ...cityEntries, ...categoryEntries].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
};
