<template>
  <NavigationHeader @login="goToLogin" />

  <EventDetailView :event-id="detailEventId" @select="openEventDetail">
    <template #header>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-sky-900 shadow-sm transition hover:bg-sky-50"
        @click="goToHome"
      >
        <font-awesome-icon class="h-4 w-4" :icon="faArrowLeft" />
        <span>{{ $t("detail.backToAgenda") }}</span>
      </button>
    </template>
  </EventDetailView>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import NavigationHeader from "../components/navigation/Header.vue";
import EventDetailView from "../components/events/EventDetailView.vue";

const router = useRouter();
const route = useRoute();
const detailEventId = computed(() => String(route.params.id));

const goToHome = () => {
  router.push("/");
};

const goToLogin = () => {
  router.push("/login");
};

const openEventDetail = (id: string) => {
  router.push(`/event/${id}`);
};
</script>
