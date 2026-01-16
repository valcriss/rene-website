<template>
  <NavigationHeader @login="goToLogin" />

  <section class="mx-auto max-w-7xl px-6 py-16">
    <HomeTitle />

    <HomeSearch v-model="filters.search" @reset="resetFilters" />

    <div class="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">Événements à venir</h2>
        <span class="text-sm text-slate-500">{{ filteredEvents.length }} résultats</span>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-12">
        <HomeFilters
          v-model="filters"
          :available-cities="availableCities"
          :available-categories="categories"
          @date-range-change="handleDateRangeChange"
          @apply-preset="applyPreset"
          @toggle-city="toggleCity"
          @toggle-type="toggleType"
        />

        <div class="lg:col-span-6">
          <div v-if="isLoading" class="rounded-2xl border border-dashed border-slate-200 p-6 text-slate-500">
            Chargement des événements…
          </div>
          <div v-else-if="error" class="rounded-2xl bg-rose-50 p-4 text-rose-700">
            {{ error }}
          </div>
          <div v-else-if="publishedEvents.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-6 text-slate-500">
            Aucun événement n'est encore publié.
          </div>
          <div v-else-if="filteredEvents.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-6 text-slate-500">
            Aucun événement ne correspond aux filtres.
          </div>
          <ul v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="event-grid">
            <li
              v-for="eventItem in filteredEvents"
              :key="eventItem.id"
              class="group relative flex min-h-[220px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm"
              role="button"
              tabindex="0"
              :data-testid="`event-card-${eventItem.id}`"
              @click="openEventDetail(eventItem.id)"
              @keydown.enter="openEventDetail(eventItem.id)"
            >
              <img
                class="absolute inset-0 h-full w-full object-cover"
                :src="getEventImage(eventItem)"
                :alt="eventItem.title"
                @error="markImageError(eventItem.id)"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/40 to-transparent"></div>
              <div class="relative z-10 mt-auto space-y-2 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-200">
                  {{ formatDateRange(eventItem.eventStartAt, eventItem.eventEndAt) }}
                </p>
                <h3 class="text-lg font-semibold leading-tight">
                  {{ eventItem.title }}
                </h3>
                <p class="text-sm text-slate-100/90 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                  {{ getEventExcerpt(eventItem) }}
                </p>
                <p class="text-xs text-slate-200">
                  {{ eventItem.venueName }} · {{ eventItem.city }}
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div class="lg:col-span-3">
          <EventMap :events="filteredEvents" @select="openEventDetail" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import EventMap from "../components/EventMap.vue";
import HomeFilters from "../components/home/Filters.vue";
import HomeSearch from "../components/home/Search.vue";
import HomeTitle from "../components/home/Title.vue";
import NavigationHeader from "../components/navigation/Header.vue";
import { useCategoriesStore } from "../stores/categories";
import { useEventsStore } from "../stores/events";

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

onMounted(() => {
  categoriesStore.loadCategories();
});

const goToLogin = () => {
  router.push("/login");
};

const openEventDetail = (id: string) => {
  router.push(`/event/${id}`);
};
</script>
