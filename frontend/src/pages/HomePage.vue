<template>
  <NavigationHeader @login="goToLogin" />

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
            <HomeTitle />
            <p class="max-w-2xl text-sm font-semibold uppercase tracking-[0.28em] text-sky-700/65">
              Sortir, découvrir, partager
            </p>
            <p class="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Une sélection visuelle des rendez-vous culturels à ne pas manquer autour de Descartes, pensée
              pour donner envie avant même de filtrer.
            </p>
          </div>

          <div class="mt-8">
            <HomeSearch v-model="filters.search" @reset="resetFilters" />
          </div>
        </div>

        <article
          v-if="featuredEvent"
          class="group relative overflow-hidden rounded-[2.25rem] border border-slate-900/10 bg-slate-950 text-white shadow-[0_36px_120px_-52px_rgba(15,23,42,0.55)]"
          :data-testid="`event-card-${featuredEvent.id}`"
          role="button"
          tabindex="0"
          @click="openEventDetail(featuredEvent.id)"
          @keydown.enter="openEventDetail(featuredEvent.id)"
        >
          <img
            class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            :src="getEventImage(featuredEvent)"
            :alt="featuredEvent.title"
            @error="markImageError(featuredEvent.id)"
          />
          <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.58)_45%,rgba(96,165,250,0.24)_100%)]"></div>
          <div class="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

          <div class="relative flex min-h-[420px] flex-col justify-between p-6 sm:p-8 xl:min-h-[520px]">
            <div class="flex flex-wrap items-center gap-3">
              <span class="rounded-full bg-white/92 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-900">
                À la une
              </span>
              <span class="rounded-full bg-slate-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white ring-1 ring-white/20 backdrop-blur">
                {{ formatDateRange(featuredEvent.eventStartAt, featuredEvent.eventEndAt) }}
              </span>
              <span
                v-if="getCategoryName(featuredEvent.categoryId)"
                class="rounded-full px-4 py-2 text-xs font-semibold ring-1 backdrop-blur"
                :style="getCategoryTheme(featuredEvent.categoryId)"
              >
                {{ getCategoryName(featuredEvent.categoryId) }}
              </span>
            </div>

            <div class="max-w-2xl space-y-4">
              <p class="text-sm font-medium uppercase tracking-[0.28em] text-white/75">
                {{ featuredEvent.venueName }} · {{ featuredEvent.city }}
              </p>
              <h2 class="font-display max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                {{ featuredEvent.title }}
              </h2>
              <p class="max-w-xl text-base leading-7 text-white/85 sm:text-lg">
                {{ getEventExcerpt(featuredEvent) || "Un rendez-vous culturel à découvrir dans la sélection du moment." }}
              </p>
              <div class="flex flex-wrap items-center gap-4 pt-3">
                <span class="rounded-full bg-gradient-to-r from-sky-500 to-indigo-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20">
                  Voir l'événement
                </span>
                <span class="text-sm font-medium uppercase tracking-[0.24em] text-white/65">
                  Programmation recommandée
                </span>
              </div>
            </div>
          </div>
        </article>

        <div
          v-else
          class="rounded-[2.25rem] border border-dashed border-sky-100 bg-white/80 p-8 text-slate-500 shadow-sm backdrop-blur xl:min-h-[520px]"
        >
          Aucun événement mis en avant pour le moment.
        </div>
      </div>

      <div class="mt-8 rounded-[2rem] border border-white/90 bg-white/90 p-4 shadow-[0_24px_80px_-48px_rgba(30,41,59,0.2)] backdrop-blur sm:p-6 xl:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700/75">Sélection du moment</p>
            <h3 class="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Une programmation pensée comme une vitrine
            </h3>
            <p class="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Explore les événements à venir, affine si besoin, puis découvre les lieux sur la carte en
              complément de la sélection visuelle.
            </p>
          </div>
          <span class="rounded-full bg-gradient-to-r from-slate-900 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-slate-900/15">
            {{ filteredEvents.length }} résultats
          </span>
        </div>

        <div class="mt-6">
          <HomeFilters
            v-model="filters"
            :available-cities="availableCities"
            :available-categories="categories"
            @date-range-change="handleDateRangeChange"
            @apply-preset="applyPreset"
            @toggle-city="toggleCity"
            @toggle-type="toggleType"
          />
        </div>

        <div class="mt-8">
          <div
            v-if="isLoading"
            class="rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/50 p-6 text-slate-500"
          >
            Chargement des événements…
          </div>
          <div v-else-if="error" class="rounded-[1.75rem] bg-rose-50 p-4 text-rose-700">
            {{ error }}
          </div>
          <div
            v-else-if="publishedEvents.length === 0"
            class="rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/50 p-6 text-slate-500"
          >
            Aucun événement n'est encore publié.
          </div>
          <div
            v-else-if="filteredEvents.length === 0"
            class="rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/50 p-6 text-slate-500"
          >
            Aucun événement ne correspond aux filtres.
          </div>
          <div v-else class="space-y-10">
            <ul class="grid gap-6 xl:grid-cols-2" data-testid="event-grid">
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
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent"></div>
                  <div class="absolute left-5 top-5 flex flex-wrap gap-2">
                    <span class="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-800 shadow-sm">
                      {{ formatDateRange(eventItem.eventStartAt, eventItem.eventEndAt) }}
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
                      {{ eventItem.venueName }} · {{ eventItem.city }}
                    </p>
                    <h4 class="font-display text-2xl font-semibold leading-tight text-slate-950">
                      {{ eventItem.title }}
                    </h4>
                    <p class="text-base leading-7 text-slate-600 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
                      {{ getEventExcerpt(eventItem) }}
                    </p>
                  </div>

                  <div class="flex items-center justify-between gap-4 border-t border-sky-100 pt-4">
                    <span class="text-sm font-semibold text-slate-900">Découvrir l'événement</span>
                    <span class="text-xs font-medium uppercase tracking-[0.22em] text-sky-700/70">Programme local</span>
                  </div>
                </div>
              </li>
            </ul>

            <div class="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white to-sky-50/70 p-5 shadow-[0_24px_72px_-52px_rgba(30,41,59,0.18)] sm:p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/75">Explorer la zone</p>
                  <h4 class="font-display mt-2 text-xl font-semibold tracking-tight text-slate-950">Carte des événements</h4>
                </div>
                <p class="text-sm text-slate-500">Repère géographique complémentaire</p>
              </div>
              <div class="mt-5">
                <EventMap :events="filteredEvents" @select="openEventDetail" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import EventMap from "../components/EventMap.vue";
import HomeFilters from "../components/home/Filters.vue";
import HomeSearch from "../components/home/Search.vue";
import HomeTitle from "../components/home/Title.vue";
import NavigationHeader from "../components/navigation/Header.vue";
import { useCategoriesStore } from "../stores/categories";
import { useEventsStore } from "../stores/events";

type CategoryTheme = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

const router = useRouter();
const eventsStore = useEventsStore();
const categoriesStore = useCategoriesStore();
const {
  filters,
  filteredEvents,
  publishedEvents,
  availableCities,
  isLoading,
  error
} = storeToRefs(eventsStore);
const { categories } = storeToRefs(categoriesStore);

const categoryNames = computed(() =>
  new Map(categories.value.map((category) => [category.id, category.name]))
);

const featuredEvent = computed(() => filteredEvents.value[0] ?? null);
const spotlightEvents = computed(() => filteredEvents.value.slice(1));

const {
  resetFilters,
  handleDateRangeChange,
  applyPreset,
  toggleCity,
  toggleType,
  getEventImage,
  markImageError,
  formatDateRange,
  getEventExcerpt
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

const openEventDetail = (id: string) => {
  router.push(`/event/${id}`);
};
</script>
