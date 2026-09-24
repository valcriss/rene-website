<template>
  <NavigationHeader @login="goToLogin" />

  <EventDetailView :event-id="detailEventId" @select="openEventDetail">
    <template #header>
      <RouterLink
        to="/"
        class="inline-flex items-center justify-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-sky-900 shadow-sm transition hover:bg-sky-50"
      >
        <font-awesome-icon class="h-4 w-4" :icon="faArrowLeft" />
        <span>{{ $t("detail.backToAgenda") }}</span>
      </RouterLink>
    </template>
  </EventDetailView>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import NavigationHeader from "../components/navigation/Header.vue";
import EventDetailView from "../components/events/EventDetailView.vue";
import { useEventsStore } from "../stores/events";
import { usePageSeo } from "../composables/usePageSeo";
import { useEventStructuredData } from "../composables/useStructuredData";
import { buildPlainTextDescription } from "../utils/seo";
import { getEventDetailPath } from "../utils/eventLinks";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const eventsStore = useEventsStore();
const detailEventId = computed(() => eventsStore.getEventBySlug(String(route.params.slug))?.id ?? "");

// Mirrors EventDetailView's own visibility rule (hide only manually archived events) so the
// meta tags always match what the page actually shows, without duplicating its store wiring.
const seoEvent = computed(() => {
  const event = eventsStore.getEventById(detailEventId.value);
  return event && !event.archivedAt ? event : null;
});

usePageSeo({
  title: () => (seoEvent.value ? `${seoEvent.value.title} — ${t("navigation.title")}` : t("detail.notFound")),
  description: () =>
    seoEvent.value ? buildPlainTextDescription(seoEvent.value.content) : t("detail.notFound"),
  image: () => seoEvent.value?.image,
  type: "article"
});

useEventStructuredData(() => seoEvent.value);

const goToLogin = () => {
  router.push("/login");
};

const openEventDetail = (id: string) => {
  const event = eventsStore.getEventById(id);
  if (event) {
    router.push(getEventDetailPath(event));
  }
};
</script>
