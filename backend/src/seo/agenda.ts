import { EventRepository } from "../events/repository";
import { Event } from "../events/types";
import { slugify } from "../events/slug";

export type AgendaFacet = { slug: string; name: string };

// An event counts toward "active" facets only once it is published and not archived — the same
// visibility rule the public API, SSR routing and sitemap already enforce elsewhere.
const isPubliclyVisible = (event: Event) => event.status === "PUBLISHED" && !event.archivedAt;

// A city or category is "known" (worth a 200 with an empty state rather than a 404) as soon as
// any event has ever referenced it, regardless of that event's current status — this keeps a
// landing page around, showing an empty state, right after its last event is archived, instead of
// flapping to a 404 the moment the catalog empties out. "Active" (worth listing in the sitemap and
// indexing) is the stricter, live-visibility rule.
const collectCityFacets = (events: Event[], predicate: (event: Event) => boolean): AgendaFacet[] => {
  const bySlug = new Map<string, string>();
  for (const event of events) {
    if (!predicate(event)) {
      continue;
    }
    for (const occurrence of event.occurrences) {
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

const collectCategoryIds = (events: Event[], predicate: (event: Event) => boolean): string[] => {
  const ids = new Set<string>();
  for (const event of events) {
    if (predicate(event) && event.categoryId) {
      ids.add(event.categoryId);
    }
  }
  return Array.from(ids).sort();
};

export const getKnownCityFacets = (events: Event[]): AgendaFacet[] => collectCityFacets(events, () => true);
export const getActiveCityFacets = (events: Event[]): AgendaFacet[] => collectCityFacets(events, isPubliclyVisible);

export const getKnownCategoryIds = (events: Event[]): string[] => collectCategoryIds(events, () => true);
export const getActiveCategoryIds = (events: Event[]): string[] => collectCategoryIds(events, isPubliclyVisible);

export type AgendaPageStatus = { status: 200 | 404; isEmpty: boolean };

export const getAgendaCityPageStatus = async (repo: EventRepository, citySlug: string): Promise<AgendaPageStatus> => {
  const events = await repo.list();
  const known = getKnownCityFacets(events).some((facet) => facet.slug === citySlug);
  if (!known) {
    return { status: 404, isEmpty: false };
  }
  const active = getActiveCityFacets(events).some((facet) => facet.slug === citySlug);
  return { status: 200, isEmpty: !active };
};

export const getAgendaCategoryPageStatus = async (
  repo: EventRepository,
  categoryId: string
): Promise<AgendaPageStatus> => {
  const events = await repo.list();
  if (!getKnownCategoryIds(events).includes(categoryId)) {
    return { status: 404, isEmpty: false };
  }
  const isEmpty = !getActiveCategoryIds(events).includes(categoryId);
  return { status: 200, isEmpty };
};
