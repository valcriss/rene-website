// Mirrors backend/src/events/slug.ts's slugify exactly: city/category landing page slugs are
// generated server-side (sitemap, SSR status checks) and must resolve back to the same facet
// here, or a link from the sitemap could 404 on the client after hydration.
export const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
