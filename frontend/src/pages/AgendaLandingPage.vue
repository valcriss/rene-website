<template>
  <NavigationHeader @login="goToLogin" />

  <section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">{{ eyebrow }}</p>
    <h1 class="font-display mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
      {{ heading }}
    </h1>
    <p class="mt-3 max-w-2xl text-base leading-7 text-slate-600">{{ intro }}</p>

    <div v-if="visibleEvents.length === 0" class="mt-8 rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/60 p-8 text-slate-500">
      <p>{{ t("agenda.empty") }}</p>
      <RouterLink to="/" class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2">
        {{ t("agenda.backToFullAgenda") }}
      </RouterLink>
    </div>

    <ul v-else class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="agenda-landing-list">
      <li
        v-for="eventItem in visibleEvents"
        :key="eventItem.id"
        class="group overflow-hidden rounded-[1.75rem] border border-sky-100 bg-white shadow-[0_20px_64px_-52px_rgba(30,41,59,0.28)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_72px_-46px_rgba(30,41,59,0.26)]"
      >
        <RouterLink
          :to="getEventDetailPath(eventItem)"
          class="block"
          :data-testid="`agenda-landing-card-${eventItem.id}`"
        >
          <div class="relative aspect-[16/10] overflow-hidden bg-sky-100">
            <img
              class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              :src="getEventImage(eventItem)"
              :alt="eventItem.imageAlt || eventItem.title"
              loading="lazy"
              decoding="async"
              @error="markImageError(eventItem.id)"
            />
            <span class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-800 shadow-sm">
              {{ formatEventDateBadge(eventItem.occurrences) }}
            </span>
          </div>
          <div class="space-y-2 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/75">
              {{ getEventLocationSummary(eventItem.occurrences) }}
            </p>
            <h2 class="font-display text-xl font-semibold leading-tight text-slate-950">
              {{ eventItem.title }}
            </h2>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onServerPrefetch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useCategoriesStore } from "../stores/categories";
import { useEventsStore } from "../stores/events";
import { filterEvents } from "../events/filterEvents";
import { findCityBySlug } from "../utils/agendaFacets";
import { formatDateInput, getWeekendRange } from "../utils/dateRangePresets";
import { formatEventDateBadge, getEventLocationSummary } from "../utils/occurrences";
import { getEventDetailPath } from "../utils/eventLinks";
import { buildPlainTextDescription } from "../utils/seo";
import { usePageSeo } from "../composables/usePageSeo";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const eventsStore = useEventsStore();
const categoriesStore = useCategoriesStore();
const { getEventImage, markImageError } = eventsStore;

// A slug/id that doesn't resolve to any currently active event has nothing meaningful to display
// as its proper name — falling back to a naive de-slugified version of the URL segment keeps the
// heading readable instead of showing raw punctuation.
const humanizeSlug = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || value;

const routeSlug = computed(() => String(route.params.slug ?? ""));

const cityFacet = computed(() =>
  route.name === "agenda-city" ? findCityBySlug(eventsStore.events, routeSlug.value) : null
);
const cityName = computed(() => cityFacet.value?.name ?? humanizeSlug(routeSlug.value));

// Only ever read from a branch already guarded by route.name === "agenda-category" below.
const categoryName = computed(
  () =>
    categoriesStore.categories.find((category) => category.id === routeSlug.value)?.name ??
    humanizeSlug(routeSlug.value)
);

const eyebrow = computed(() => t("agenda.eyebrow"));

const heading = computed(() => {
  if (route.name === "agenda-city") {
    return t("agenda.city.title", { city: cityName.value });
  }
  if (route.name === "agenda-category") {
    return t("agenda.category.title", { category: categoryName.value });
  }
  return t("agenda.weekend.title");
});

const intro = computed(() => {
  if (route.name === "agenda-city") {
    return t("agenda.city.intro", { city: cityName.value });
  }
  if (route.name === "agenda-category") {
    return t("agenda.category.intro", { category: categoryName.value });
  }
  return t("agenda.weekend.intro");
});

// Mirrors HomePage's own default filter (from today onward, no other facet active) so a landing
// page never shows an event that has already ended.
const visibleEvents = computed(() => {
  const today = formatDateInput(new Date());
  const baseFilters = { search: "", cities: [] as string[], types: [] as string[], audiences: [] as string[], dateRange: { start: today, end: "" } };

  if (route.name === "agenda-city") {
    return filterEvents(eventsStore.publishedEvents, { ...baseFilters, cities: [cityName.value] });
  }
  if (route.name === "agenda-category") {
    return filterEvents(eventsStore.publishedEvents, { ...baseFilters, types: [routeSlug.value] });
  }
  return filterEvents(eventsStore.publishedEvents, { ...baseFilters, dateRange: getWeekendRange(new Date()) });
});

usePageSeo({
  title: () => `${heading.value} — ${t("navigation.title")}`,
  description: () => buildPlainTextDescription(intro.value)
});

categoriesStore.loadCategories();
onServerPrefetch(() => categoriesStore.loadCategories());

const goToLogin = () => {
  router.push("/login");
};
</script>
