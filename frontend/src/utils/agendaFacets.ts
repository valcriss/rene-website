import type { EventItem } from "../api/events";
import { slugify } from "./slugify";

export type AgendaFacet = { slug: string; name: string };

// Mirrors backend/src/seo/agenda.ts exactly: a facet is "active" only for a currently public
// event (published, not archived) — the same rule the public API and sitemap already apply.
// "Known" (used to resolve a /agenda/ville/:slug back to a real city name) considers every event
// regardless of status, so a page never flips to a dead end the moment its last event is archived.
const isPubliclyVisible = (event: EventItem) => event.status === "PUBLISHED" && !event.archivedAt;

const collectCityFacets = (events: EventItem[], predicate: (event: EventItem) => boolean): AgendaFacet[] => {
  const bySlug = new Map<string, string>();
  for (const event of events) {
    if (!predicate(event)) {
      continue;
    }
    for (const occurrence of event.occurrences ?? []) {
      const city = occurrence.city?.trim();
      if (!city) {
        continue;
      }
      const slug = slugify(city);
      if (slug && !bySlug.has(slug)) {
        bySlug.set(slug, city);
      }
    }
  }
  return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
};

const collectCategoryIds = (events: EventItem[], predicate: (event: EventItem) => boolean): string[] => {
  const ids = new Set<string>();
  for (const event of events) {
    if (predicate(event) && event.categoryId) {
      ids.add(event.categoryId);
    }
  }
  return Array.from(ids).sort();
};

export const getKnownCityFacets = (events: EventItem[]): AgendaFacet[] => collectCityFacets(events, () => true);
export const getActiveCityFacets = (events: EventItem[]): AgendaFacet[] =>
  collectCityFacets(events, isPubliclyVisible);

export const getKnownCategoryIds = (events: EventItem[]): string[] => collectCategoryIds(events, () => true);
export const getActiveCategoryIds = (events: EventItem[]): string[] =>
  collectCategoryIds(events, isPubliclyVisible);

export const findCityBySlug = (events: EventItem[], slug: string): AgendaFacet | null =>
  getKnownCityFacets(events).find((facet) => facet.slug === slug) ?? null;
