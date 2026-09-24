import { useHead, useSeoMeta } from "@unhead/vue";
import { toValue, type MaybeRefOrGetter } from "vue";
import { useRoute } from "vue-router";
import { useSiteUrl } from "./useSiteUrl";
import { DEFAULT_OG_IMAGE_PATH, toAbsoluteUrl } from "../utils/seo";

export type PageSeoOptions = {
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  image?: MaybeRefOrGetter<string | null | undefined>;
  imageAlt?: MaybeRefOrGetter<string | null | undefined>;
  type?: MaybeRefOrGetter<"website" | "article">;
  // Overrides the current route path for the canonical/og:url — used by pages rendered
  // outside their own route (e.g. the backoffice preview reusing EventDetailView).
  path?: MaybeRefOrGetter<string | undefined>;
};

// Shared per-page metadata: unique title/description, absolute canonical URL, Open Graph and
// X/Twitter Card tags. Falls back to the brand default image when a page has none of its own,
// always resolved to an absolute URL (relative OG/Twitter image URLs are not spec-compliant).
export const usePageSeo = (options: PageSeoOptions) => {
  const siteUrl = useSiteUrl();
  const route = useRoute();

  const canonicalUrl = () => toAbsoluteUrl(siteUrl, toValue(options.path) ?? route.path);
  const imageUrl = () => toAbsoluteUrl(siteUrl, toValue(options.image) || DEFAULT_OG_IMAGE_PATH);

  useHead({
    link: [{ rel: "canonical", href: canonicalUrl }]
  });

  useSeoMeta({
    title: () => toValue(options.title),
    description: () => toValue(options.description),
    ogTitle: () => toValue(options.title),
    ogDescription: () => toValue(options.description),
    ogType: () => toValue(options.type) ?? "website",
    ogUrl: canonicalUrl,
    ogImage: imageUrl,
    ogImageAlt: () => toValue(options.imageAlt) || toValue(options.title),
    twitterCard: "summary_large_image"
  });
};
