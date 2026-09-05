<template>
  <NavigationHeader
    :is-authenticated="isAuthenticated"
    :account-label="accountLabel"
    :role-label="roleLabel"
    @login="goToLogin"
    @logout="handleLogout"
  />

  <section class="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.55),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(224,231,255,0.85),_transparent_30%),linear-gradient(180deg,_#f7fbff_0%,_#eef4ff_42%,_#f8fbff_100%)]">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute left-[-8rem] top-16 h-64 w-64 rounded-full bg-sky-200/35 blur-3xl"></div>
      <div class="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl"></div>
      <div class="absolute bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-100/40 blur-3xl"></div>
    </div>

    <div class="relative mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
      <div class="grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_minmax(480px,1.08fr)] xl:items-stretch">
        <div class="flex flex-col justify-between rounded-[2rem] border border-white/90 bg-white p-6 shadow-[0_32px_120px_-56px_rgba(30,41,59,0.28)] sm:p-8 xl:p-10">
          <div class="space-y-6">
            <HomeTitle :title-lead="homepageSubtitleText" />
            <p class="max-w-2xl text-sm font-semibold uppercase tracking-[0.28em] text-sky-700/65">
              {{ t("home.eyebrow") }}
            </p>
            <p class="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              {{ introText }}
            </p>
          </div>

          <div class="mt-8">
            <HomeSearch v-model="filters.search" @reset="resetFilters" />
          </div>
        </div>

        <article
          v-if="carouselEvents.length > 0 && currentCarouselEvent"
          class="group relative overflow-hidden rounded-[2.25rem] border border-slate-900/10 bg-slate-950 text-white shadow-[0_36px_120px_-52px_rgba(15,23,42,0.55)]"
          :data-testid="`featured-card-${currentCarouselEvent.id}`"
          role="button"
          tabindex="0"
          @click="openEventDetail(currentCarouselEvent.id)"
          @keydown.enter="openEventDetail(currentCarouselEvent.id)"
        >
          <img
            class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            :src="getEventImage(currentCarouselEvent)"
            :alt="currentCarouselEvent.title"
            @error="markImageError(currentCarouselEvent.id)"
          />
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-slate-950/74 via-slate-950/34 to-transparent"></div>
          <div class="relative flex min-h-[420px] flex-col justify-between p-6 sm:p-8 xl:min-h-[520px]">
            <div class="flex flex-wrap items-center gap-3">
              <span class="rounded-full bg-white/92 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-900">
                {{ t("home.featured") }}
              </span>
              <span class="rounded-full bg-slate-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white ring-1 ring-white/20 backdrop-blur">
                {{ formatEventDateBadge(currentCarouselEvent.occurrences) }}
              </span>
              <span
                v-if="getCategoryName(currentCarouselEvent.categoryId)"
                class="rounded-full px-4 py-2 text-xs font-semibold ring-1 backdrop-blur"
                :style="getCategoryTheme(currentCarouselEvent.categoryId)"
              >
                {{ getCategoryName(currentCarouselEvent.categoryId) }}
              </span>
            </div>

            <div class="max-w-2xl space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/28 p-5 backdrop-blur-md sm:p-6">
              <p class="text-sm font-medium uppercase tracking-[0.28em] text-white/88 [text-shadow:0_1px_10px_rgba(15,23,42,0.8)]">
                {{ getEventLocationSummary(currentCarouselEvent.occurrences) }}
              </p>
              <h2 class="font-display max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white [text-shadow:0_4px_18px_rgba(15,23,42,0.82)] sm:text-5xl">
                {{ currentCarouselEvent.title }}
              </h2>
              <p class="max-w-xl text-base leading-7 text-white/92 [text-shadow:0_2px_12px_rgba(15,23,42,0.78)] sm:text-lg">
                {{ getEventShortExcerpt(currentCarouselEvent) || t("home.featuredFallback") }}
              </p>
              <p v-if="formatUpdatedAtLabel(currentCarouselEvent.updatedAt)" class="text-xs font-medium tracking-[0.18em] text-white/72">
                {{ formatUpdatedAtLabel(currentCarouselEvent.updatedAt) }}
              </p>
              <div class="flex flex-wrap items-center gap-4 pt-3">
                <span class="rounded-full bg-gradient-to-r from-sky-500 to-indigo-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20">
                  {{ t("home.viewEvent") }}
                </span>
                <span class="text-sm font-medium uppercase tracking-[0.24em] text-white/82 [text-shadow:0_2px_10px_rgba(15,23,42,0.8)]">
                  {{ t("home.recommended") }}
                </span>
                <div v-if="carouselEvents.length > 1" class="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur transition hover:bg-white/20"
                    :aria-label="t('home.previousFeatured')"
                    @click.stop="goToPreviousSlide"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur transition hover:bg-white/20"
                    :aria-label="t('home.nextFeatured')"
                    @click.stop="goToNextSlide"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div v-if="carouselEvents.length > 1" class="flex gap-2 pt-2">
                <button
                  v-for="(_eventItem, index) in carouselEvents"
                  :key="index"
                  type="button"
                  class="h-2.5 w-8 rounded-full transition"
                  :class="index === currentSlide ? 'bg-white' : 'bg-white/35 hover:bg-white/55'"
                  :aria-label="`${t('home.featured')} ${index + 1}`"
                  @click.stop="currentSlide = index"
                />
              </div>
            </div>
          </div>
        </article>

        <div
          v-else
          class="rounded-[2.25rem] border border-dashed border-sky-100 bg-white/80 p-8 text-slate-500 shadow-sm backdrop-blur xl:min-h-[520px]"
        >
          {{ t("home.noFeatured") }}
        </div>
      </div>

      <div class="mt-8 rounded-[2rem] border border-white/90 bg-white/90 p-4 shadow-[0_24px_80px_-48px_rgba(30,41,59,0.2)] backdrop-blur sm:p-6 xl:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700/75">{{ t("home.sectionEyebrow") }}</p>
            <h3 class="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {{ t("home.sectionTitle") }}
            </h3>
            <p class="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {{ t("home.sectionLead") }}
            </p>
          </div>
          <span class="rounded-full bg-gradient-to-r from-slate-900 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-slate-900/15">
            {{ t("home.results", filteredEvents.length) }}
          </span>
        </div>

        <div class="mt-6">
          <HomeFilters
            v-model="filters"
            :available-cities="availableCities"
            :available-categories="categories"
            :available-audiences="audiences"
            @date-range-change="handleDateRangeChange"
            @apply-preset="applyPreset"
            @toggle-city="toggleCity"
            @toggle-type="toggleType"
            @toggle-audience="toggleAudience"
          />
        </div>

        <div class="mt-8">
          <div
            v-if="isLoading"
            class="flex items-center gap-3 rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/50 p-6 text-slate-500"
          >
            <LoadingSpinner size="sm" />
            <span>{{ t("home.loading") }}</span>
          </div>
          <div v-else-if="error" class="rounded-[1.75rem] bg-rose-50 p-4 text-rose-700">
            {{ error }}
          </div>
          <div
            v-else-if="publishedEvents.length === 0"
            class="rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/50 p-6 text-slate-500"
          >
            {{ t("home.noPublished") }}
          </div>
          <div
            v-else-if="filteredEvents.length === 0"
            class="rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/50 p-6 text-slate-500"
          >
            {{ t("home.noFiltered") }}
          </div>
          <div v-else class="space-y-10">
            <ul class="grid gap-6 xl:grid-cols-3" data-testid="event-grid">
              <li
                v-for="eventItem in spotlightEvents"
                :key="eventItem.id"
                class="group cursor-pointer overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_24px_72px_-54px_rgba(30,41,59,0.28)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_32px_84px_-46px_rgba(30,41,59,0.24)]"
                role="button"
                tabindex="0"
                :data-testid="`event-card-${eventItem.id}`"
                @click="openEventDetail(eventItem.id)"
                @keydown.enter="openEventDetail(eventItem.id)"
              >
                <div class="relative aspect-[16/10] overflow-hidden bg-sky-100">
                  <img
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    :src="getEventImage(eventItem)"
                    :alt="eventItem.title"
                    @error="markImageError(eventItem.id)"
                  />
                  <div class="absolute left-5 top-5 flex flex-wrap gap-2">
                    <span class="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-800 shadow-sm">
                      {{ formatEventDateBadge(eventItem.occurrences) }}
                    </span>
                    <span
                      v-if="getCategoryName(eventItem.categoryId)"
                      class="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 shadow-sm"
                      :style="getCategoryTheme(eventItem.categoryId)"
                    >
                      {{ getCategoryName(eventItem.categoryId) }}
                    </span>
                  </div>
                </div>

                <div class="space-y-4 p-5 sm:p-6">
                  <div class="space-y-3">
                    <p class="text-sm font-medium uppercase tracking-[0.22em] text-sky-700/80">
                      {{ getEventLocationSummary(eventItem.occurrences) }}
                    </p>
                    <h4 class="font-display text-2xl font-semibold leading-tight text-slate-950">
                      {{ eventItem.title }}
                    </h4>
                    <p class="text-base leading-7 text-slate-600 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
                      {{ getEventShortExcerpt(eventItem) }}
                    </p>
                    <p v-if="formatUpdatedAtLabel(eventItem.updatedAt)" class="text-xs text-slate-400">
                      {{ formatUpdatedAtLabel(eventItem.updatedAt) }}
                    </p>
                  </div>

                  <div class="flex items-center justify-between gap-4 border-t border-sky-100 pt-4">
                    <span class="text-sm font-semibold text-slate-900">{{ t("home.viewEvent") }}</span>
                    <span class="text-xs font-medium uppercase tracking-[0.22em] text-sky-700/70">{{ t("home.localProgram") }}</span>
                  </div>
                </div>
              </li>
            </ul>

            <div class="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white to-sky-50/70 p-5 shadow-[0_24px_72px_-52px_rgba(30,41,59,0.18)] sm:p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/75">{{ t("home.mapEyebrow") }}</p>
                  <h4 class="font-display mt-2 text-xl font-semibold tracking-tight text-slate-950">{{ t("home.mapTitle") }}</h4>
                </div>
                <p class="text-sm text-slate-500">{{ t("home.mapLead") }}</p>
              </div>
              <div class="mt-5">
                <EventMap :pins="eventsStore.getEventMapPins(filteredEvents)" @select="openEventDetail" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import EventMap from "../components/EventMap.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import HomeFilters from "../components/home/Filters.vue";
import HomeSearch from "../components/home/Search.vue";
import HomeTitle from "../components/home/Title.vue";
import NavigationHeader from "../components/navigation/Header.vue";
import type { EventItem } from "../api/events";
import { useAuthStore } from "../stores/auth";
import { useAudiencesStore } from "../stores/audiences";
import { useCategoriesStore } from "../stores/categories";
import { useEventsStore } from "../stores/events";
import { useSettingsStore } from "../stores/settings";
import { formatEventDateBadge, getEarliestOccurrence, getEventLocationSummary } from "../utils/occurrences";

type CategoryTheme = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const eventsStore = useEventsStore();
const categoriesStore = useCategoriesStore();
const audiencesStore = useAudiencesStore();
const settingsStore = useSettingsStore();
const { homepageIntro, homepageSubtitle } = storeToRefs(settingsStore);
const {
  filters,
  filteredEvents,
  publishedEvents,
  availableCities,
  isLoading,
  error
} = storeToRefs(eventsStore);
const { categories } = storeToRefs(categoriesStore);
const { audiences } = storeToRefs(audiencesStore);
const { isAuthenticated, role, userName } = storeToRefs(authStore);

const roleLabel = computed(() => t(`backoffice.roleLabels.${role.value}`));
const homepageSubtitleText = computed(() => homepageSubtitle.value?.trim() || t("home.titleLead"));
const introText = computed(() => homepageIntro.value?.trim() || t("home.intro"));
const accountLabel = computed(() => userName.value || t("common.mySpace"));

const categoryNames = computed(() =>
  new Map(categories.value.map((category) => [category.id, category.name]))
);

const now = () => Date.now();
const isStillActive = (event: EventItem) => new Date(event.publicationEndAt ?? "").getTime() > now();
const earliestStart = (event: EventItem) => getEarliestOccurrence(event.occurrences ?? [])?.eventStartAt ?? "";
const activeFeaturedEvents = computed(() =>
  filteredEvents.value.filter((event) => event.featured === true && isStillActive(event))
);
const fallbackFeaturedEvent = computed(() => filteredEvents.value.find((event) => isStillActive(event)) ?? null);
const carouselEvents = computed(() =>
  activeFeaturedEvents.value.length > 0
    ? [...activeFeaturedEvents.value].sort((left, right) => earliestStart(left).localeCompare(earliestStart(right)))
    : fallbackFeaturedEvent.value
      ? [fallbackFeaturedEvent.value]
      : []
);
const spotlightEvents = computed(() => filteredEvents.value);
const currentSlide = ref(0);
const currentCarouselEvent = computed(() => carouselEvents.value[currentSlide.value] ?? null);

watch(
  () => carouselEvents.value.length,
  (length) => {
    if (length === 0) {
      currentSlide.value = 0;
      return;
    }
    if (currentSlide.value >= length) {
      currentSlide.value = 0;
    }
  },
  { immediate: true }
);

const {
  resetFilters,
  handleDateRangeChange,
  applyPreset,
  toggleCity,
  toggleType,
  toggleAudience,
  getEventImage,
  markImageError,
  formatUpdatedAtLabel,
  getEventShortExcerpt
} = eventsStore;

const categoryThemeMap: Record<string, CategoryTheme> = {
  atelier: { backgroundColor: "rgba(125, 211, 252, 0.2)", color: "#075985", borderColor: "rgba(56, 189, 248, 0.32)" },
  cinema: { backgroundColor: "rgba(129, 140, 248, 0.18)", color: "#3730a3", borderColor: "rgba(99, 102, 241, 0.28)" },
  exposition: { backgroundColor: "rgba(103, 232, 249, 0.2)", color: "#155e75", borderColor: "rgba(34, 211, 238, 0.28)" },
  festival: { backgroundColor: "rgba(167, 139, 250, 0.2)", color: "#6d28d9", borderColor: "rgba(139, 92, 246, 0.28)" },
  lecture: { backgroundColor: "rgba(186, 230, 253, 0.24)", color: "#1d4ed8", borderColor: "rgba(96, 165, 250, 0.28)" },
  marche: { backgroundColor: "rgba(134, 239, 172, 0.2)", color: "#166534", borderColor: "rgba(74, 222, 128, 0.28)" },
  musique: { backgroundColor: "rgba(192, 219, 254, 0.24)", color: "#1e3a8a", borderColor: "rgba(96, 165, 250, 0.28)" },
  theatre: { backgroundColor: "rgba(244, 114, 182, 0.18)", color: "#9d174d", borderColor: "rgba(236, 72, 153, 0.28)" },
  science: { backgroundColor: "rgba(110, 231, 245, 0.2)", color: "#0f766e", borderColor: "rgba(45, 212, 191, 0.28)" }
};

onMounted(() => {
  categoriesStore.loadCategories();
  audiencesStore.loadAudiences();
  settingsStore.loadPublicSettings();
});

const getCategoryName = (categoryId: string) => categoryNames.value.get(categoryId) ?? "";

const getCategoryTheme = (categoryId: string): CategoryTheme => {
  const normalized = categoryId.trim().toLowerCase();
  return categoryThemeMap[normalized] ?? {
    backgroundColor: "rgba(191, 219, 254, 0.24)",
    color: "#1e3a8a",
    borderColor: "rgba(96, 165, 250, 0.26)"
  };
};

const goToLogin = () => {
  router.push("/login");
};

const handleLogout = () => {
  authStore.logout();
};

const openEventDetail = (id: string) => {
  router.push(`/event/${id}`);
};

const goToPreviousSlide = () => {
  if (carouselEvents.value.length < 2) {
    return;
  }
  currentSlide.value = (currentSlide.value - 1 + carouselEvents.value.length) % carouselEvents.value.length;
};

const goToNextSlide = () => {
  if (carouselEvents.value.length < 2) {
    return;
  }
  currentSlide.value = (currentSlide.value + 1) % carouselEvents.value.length;
};
</script>
