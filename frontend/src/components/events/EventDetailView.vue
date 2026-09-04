<template>
  <section class="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.42),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(224,231,255,0.7),_transparent_28%),linear-gradient(180deg,_#f7fbff_0%,_#eef4ff_46%,_#f8fbff_100%)]">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute left-[-7rem] top-16 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl"></div>
      <div class="absolute right-[-6rem] top-24 h-64 w-64 rounded-full bg-indigo-200/25 blur-3xl"></div>
    </div>

    <div class="relative mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
      <div class="rounded-[2rem] border border-white/90 bg-white/72 p-4 shadow-[0_24px_80px_-48px_rgba(30,41,59,0.16)] backdrop-blur sm:p-6">
        <slot name="header" />

        <div v-if="isLoading && !props.event" class="mt-6 rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/60 p-6 text-slate-500">
          {{ t("detail.loading") }}
        </div>
        <div v-else-if="!detailEvent" class="mt-6 rounded-[1.75rem] border border-dashed border-sky-100 bg-sky-50/60 p-6 text-slate-500">
          {{ t("detail.notFound") }}
        </div>
        <div v-else class="mt-6 space-y-8" data-testid="event-detail">
          <article
            class="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-950 text-white shadow-[0_32px_120px_-56px_rgba(15,23,42,0.48)]"
            :class="hasPoster ? '' : 'bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_52%,#334155_100%)]'"
          >
            <div class="relative" :class="hasPoster ? '' : 'xl:grid xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)] xl:items-stretch'">
              <img
                class="w-full object-cover"
                :class="
                  hasPoster
                    ? 'h-[320px] sm:h-[420px] xl:h-[520px]'
                    : 'h-[240px] opacity-80 sm:h-[280px] xl:h-full xl:min-h-[420px]'
                "
                :src="getEventImage(detailEvent)"
                :alt="detailEvent.title"
                @error="markImageError(detailEvent.id)"
              />
              <div
                v-if="hasPoster"
                class="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-slate-950/74 via-slate-950/34 to-transparent"
              ></div>
              <div
                v-if="!hasPoster"
                class="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.45)_0%,rgba(30,41,59,0.28)_35%,rgba(15,23,42,0.82)_100%)] xl:bg-[linear-gradient(90deg,rgba(15,23,42,0.14)_0%,rgba(15,23,42,0.78)_52%,rgba(15,23,42,0.92)_100%)]"
              ></div>
              <div
                class="inset-x-0 bottom-0 p-6 sm:p-8 xl:p-10"
                :class="hasPoster ? 'absolute' : 'relative xl:flex xl:flex-col xl:justify-end'"
              >
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full bg-white/92 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-900">
                    {{ formatDateTimeRange(detailEvent.eventStartAt, detailEvent.eventEndAt) }}
                  </span>
                  <span
                    v-if="categoryName"
                    class="rounded-full px-4 py-2 text-xs font-semibold ring-1 backdrop-blur"
                    :style="categoryTheme"
                  >
                    {{ categoryName }}
                  </span>
                </div>
                <div class="mt-5 max-w-3xl space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/28 p-5 backdrop-blur-md sm:p-6">
                  <p class="text-sm font-medium uppercase tracking-[0.28em] text-white/88 [text-shadow:0_1px_10px_rgba(15,23,42,0.8)]">
                    {{ detailLocationLabel }}
                  </p>
                  <h1 class="font-display text-4xl font-semibold leading-tight tracking-tight text-white [text-shadow:0_4px_18px_rgba(15,23,42,0.82)] sm:text-5xl">
                    {{ detailEvent.title }}
                  </h1>
                </div>
              </div>
            </div>
          </article>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] xl:items-stretch">
            <div class="space-y-6">
              <section class="rounded-[2rem] border border-white/90 bg-white p-6 shadow-[0_20px_72px_-54px_rgba(30,41,59,0.24)] sm:p-8">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">{{ t("detail.summaryEyebrow") }}</p>
                    <h2 class="font-display mt-2 text-2xl font-semibold tracking-tight text-slate-950">{{ t("detail.summaryTitle") }}</h2>
                    <p v-if="detailUpdatedAtLabel" class="mt-2 text-xs text-slate-400">
                      {{ detailUpdatedAtLabel }}
                    </p>
                  </div>
                  <div class="rounded-full border border-sky-100 bg-sky-50/70 px-4 py-2 text-sm font-medium text-sky-900">
                    {{ detailLocationLabel }}
                  </div>
                </div>

                <div class="mt-6 grid gap-4 sm:grid-cols-2">
                  <div class="rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-sky-800 p-5 text-white shadow-sm shadow-slate-900/20">
                    <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                      <font-awesome-icon class="h-3.5 w-3.5" :icon="faClock" />
                      {{ t("detail.when") }}
                    </p>
                    <p class="mt-2 text-base font-semibold leading-6">{{ formatDateTimeRange(detailEvent.eventStartAt, detailEvent.eventEndAt) }}</p>
                  </div>
                  <div class="rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-sky-800 p-5 text-white shadow-sm shadow-slate-900/20">
                    <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                      <font-awesome-icon class="h-3.5 w-3.5" :icon="faLocationDot" />
                      {{ t("detail.where") }}
                    </p>
                    <p class="mt-2 text-base font-semibold leading-6">{{ detailLocationLabel }}</p>
                  </div>
                  <div class="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/70">{{ t("common.category") }}</p>
                    <p class="mt-2 text-sm leading-6 text-slate-700">{{ categoryName || t("detail.categoryFallback") }}</p>
                  </div>
                  <div class="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/70">{{ t("common.audience") }}</p>
                    <p class="mt-2 text-sm leading-6 text-slate-700">{{ audienceName || t("common.notProvided") }}</p>
                  </div>
                </div>

                <div v-if="sanitizedPricingInfo" class="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5">
                  <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
                    <font-awesome-icon class="h-3.5 w-3.5" :icon="faTicket" />
                    {{ t("detail.pricingInfo") }}
                  </p>
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div class="prose prose-slate mt-3 max-w-none text-sm prose-p:my-2 prose-p:text-slate-700 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-a:text-amber-800 prose-strong:text-slate-900" v-html="sanitizedPricingInfo"></div>
                </div>

                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="prose prose-slate mt-8 max-w-none prose-p:text-slate-600 prose-a:text-sky-700 prose-strong:text-slate-900" v-html="sanitizedContent"></div>

                <div v-if="socialLinks.length > 0" class="mt-8 rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-5" data-testid="detail-social-links">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/70">{{ t("detail.socialLinks") }}</p>
                      <p class="mt-2 text-sm text-slate-500">{{ t("detail.socialLinksLead") }}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <a
                        v-for="socialLink in socialLinks"
                        :key="`${socialLink.type}-${socialLink.url}`"
                        class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-sm shadow-sky-100/70 transition hover:border-sky-300 hover:bg-sky-50"
                        :href="socialLink.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        :aria-label="t('detail.openSocialLink', { network: socialLink.label })"
                        :title="socialLink.label"
                      >
                        <font-awesome-icon class="h-5 w-5" :icon="socialLink.icon" />
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              <section class="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white to-sky-50/70 p-5 shadow-[0_20px_72px_-54px_rgba(30,41,59,0.18)] sm:p-6">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/75">{{ t("detail.mapEyebrow") }}</p>
                    <h2 class="font-display mt-2 text-xl font-semibold tracking-tight text-slate-950">{{ t("detail.mapTitle") }}</h2>
                  </div>
                  <p class="text-sm text-slate-500">{{ detailLocationLabel }}</p>
                </div>
                <div class="mt-5">
                  <EventMap :events="[detailEvent]" :selected-id="detailEvent.id" @select="emitSelect" />
                </div>
              </section>
            </div>

            <aside class="xl:flex">
              <section class="flex h-full w-full flex-col rounded-[2rem] border border-white/90 bg-white p-6 shadow-[0_20px_72px_-54px_rgba(30,41,59,0.24)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">{{ t("detail.practicalEyebrow") }}</p>
                <h2 class="font-display mt-2 text-2xl font-semibold tracking-tight text-slate-950">{{ t("detail.practicalTitle") }}</h2>

                <div class="mt-6 flex-1 space-y-5 text-sm text-slate-600">
                  <div class="space-y-2 rounded-[1.5rem] border border-sky-200 bg-sky-50/70 p-4">
                    <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                      <font-awesome-icon class="h-3.5 w-3.5" :icon="faLocationDot" />
                      {{ t("detail.venueAccess") }}
                    </p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faLocationDot" />
                      <span><span class="font-medium text-slate-700">{{ t("common.address") }}:</span> {{ optionalAddress }}</span>
                    </p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faMapPin" />
                      <span><span class="font-medium text-slate-700">{{ t("common.postalCode") }}:</span> {{ formatOptional(detailEvent.postalCode) }}</span>
                    </p>
                  </div>

                  <div class="space-y-2">
                    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{{ t("detail.organization") }}</p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faUserGroup" />
                      <span><span class="font-medium text-slate-700">{{ t("common.organizer") }}:</span> {{ formatOptional(detailEvent.organizerName) }}</span>
                    </p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faGlobe" />
                      <span><span class="font-medium text-slate-700">{{ t("detail.organizerWebsite") }}:</span> {{ formatOptional(detailEvent.organizerUrl) }}</span>
                    </p>
                  </div>

                  <div class="space-y-2">
                    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{{ t("detail.contact") }}</p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faEnvelope" />
                      <span><span class="font-medium text-slate-700">{{ t("common.email") }}:</span> {{ formatOptional(detailEvent.contactEmail) }}</span>
                    </p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faPhone" />
                      <span><span class="font-medium text-slate-700">{{ t("common.phone") }}:</span> {{ formatPhoneNumber(detailEvent.contactPhone) }}</span>
                    </p>
                  </div>

                  <div class="space-y-2">
                    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{{ t("detail.usefulLinks") }}</p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faTicket" />
                      <span><span class="font-medium text-slate-700">{{ t("common.ticketing") }}:</span> {{ formatOptional(detailEvent.ticketUrl) }}</span>
                    </p>
                    <p class="flex items-center gap-3">
                      <font-awesome-icon class="h-4 w-4 text-sky-700" :icon="faArrowUpRightFromSquare" />
                      <span><span class="font-medium text-slate-700">{{ t("common.website") }}:</span> {{ formatOptional(detailEvent.websiteUrl) }}</span>
                    </p>
                  </div>
                </div>

                <div class="mt-8 border-t border-sky-100 pt-5" data-testid="detail-actions">
                  <div class="flex flex-wrap gap-3">
                    <a
                      class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-slate-900 to-sky-700 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-900/20"
                      :href="buildDirectionsUrl(detailEvent)"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <font-awesome-icon class="h-4 w-4" :icon="faRoute" />
                      <span>{{ t("detail.directions") }}</span>
                    </a>
                    <a
                      class="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-sky-900 shadow-sm shadow-sky-100/70 transition hover:border-sky-300 hover:bg-sky-50"
                      :href="buildCalendarUrl(detailEvent)"
                      download="evenement.ics"
                    >
                      <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <font-awesome-icon class="h-3.5 w-3.5" :icon="faCalendarPlus" />
                      </span>
                      <span>{{ t("detail.addToCalendar") }}</span>
                    </a>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <RelatedEvents :events="relatedEvents" @select="emitSelect" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DOMPurify from "dompurify";
import { storeToRefs } from "pinia";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faFacebook, faInstagram, faLinkedin, faTiktok, faXTwitter, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { useI18n } from "vue-i18n";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faArrowUpRightFromSquare,
  faCalendarPlus,
  faClock,
  faEnvelope,
  faGlobe,
  faLocationDot,
  faMapPin,
  faPhone,
  faRoute,
  faTicket,
  faUserGroup
} from "@fortawesome/free-solid-svg-icons";
import EventMap from "../EventMap.vue";
import RelatedEvents from "./RelatedEvents.vue";
import type { EventItem, SocialLinkType } from "../../api/events";
import { useAudiencesStore } from "../../stores/audiences";
import { useCategoriesStore } from "../../stores/categories";
import { useEventsStore } from "../../stores/events";
import { getEventAddressLabel, getEventLocationLabel } from "../../utils/eventLocation";
import { formatPhoneNumber } from "../../utils/formatters";

type CategoryTheme = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

type SocialLinkViewModel = {
  type: SocialLinkType;
  url: string;
  label: string;
  icon: IconDefinition;
};

const props = defineProps<{ eventId: string; event?: EventItem | null }>();

const emit = defineEmits<{
  (event: "select", id: string): void;
}>();

const { t } = useI18n();
const eventsStore = useEventsStore();
const categoriesStore = useCategoriesStore();
const audiencesStore = useAudiencesStore();
const { isLoading, imageErrorById } = storeToRefs(eventsStore);
const { categories } = storeToRefs(categoriesStore);
const { audiences } = storeToRefs(audiencesStore);

const detailEvent = computed(() => props.event ?? eventsStore.getEventById(props.eventId));
const categoryNames = computed(() =>
  new Map(categories.value.map((category) => [category.id, category.name]))
);
const audienceNames = computed(() =>
  new Map(audiences.value.map((audience) => [audience.id, audience.name]))
);

const sanitizedContent = computed(() => {
  const raw = detailEvent.value?.content ?? "";
  if (!raw) {
    return `<p>${formatOptional(raw)}</p>`;
  }
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["p", "br", "a", "strong", "em", "u"],
    ALLOWED_ATTR: ["href", "target", "rel"]
  });
});

const sanitizedPricingInfo = computed(() => {
  const raw = detailEvent.value?.pricingInfo ?? "";
  if (!raw || raw.trim().length === 0) {
    return "";
  }
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["p", "br", "a", "strong", "em", "u", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"]
  });
});

const detailUpdatedAtLabel = computed(() => formatUpdatedAtLabel(detailEvent.value?.updatedAt));

const detailLocationLabel = computed(() =>
  detailEvent.value ? getEventLocationLabel(detailEvent.value, t("common.notProvided")) : ""
);

const optionalAddress = computed(() => {
  if (!detailEvent.value) {
    return "";
  }
  return getEventAddressLabel(detailEvent.value, t("common.notProvided"));
});

const categoryName = computed(() => {
  return categoryNames.value.get(detailEvent.value?.categoryId ?? "") ?? "";
});

const audienceName = computed(() => {
  return audienceNames.value.get(detailEvent.value?.audienceId ?? "") ?? "";
});

const socialIconMap: Record<SocialLinkType, IconDefinition> = {
  FACEBOOK: faFacebook,
  INSTAGRAM: faInstagram,
  YOUTUBE: faYoutube,
  LINKEDIN: faLinkedin,
  X: faXTwitter,
  TIKTOK: faTiktok
};

const socialLinks = computed<SocialLinkViewModel[]>(() =>
  (detailEvent.value?.socialLinks ?? []).map((socialLink) => ({
    ...socialLink,
    label: t(`editor.socialLinkTypes.${socialLink.type}`),
    icon: socialIconMap[socialLink.type]
  }))
);

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

const categoryTheme = computed(() => {
  const categoryId = detailEvent.value?.categoryId ?? "";
  const normalized = categoryId.trim().toLowerCase();
  return categoryThemeMap[normalized] ?? {
    backgroundColor: "rgba(191, 219, 254, 0.24)",
    color: "#1e3a8a",
    borderColor: "rgba(96, 165, 250, 0.26)"
  };
});

const hasPoster = computed(() => {
  return Boolean(detailEvent.value?.image) && !imageErrorById.value[detailEvent.value?.id ?? ""];
});

const relatedEvents = computed(() => (props.event ? [] : eventsStore.getRelatedPublishedEvents(props.eventId, 3)));

audiencesStore.loadAudiences();

const {
  getEventImage,
  markImageError,
  formatDateTimeRange,
  formatUpdatedAtLabel,
  formatOptional,
  buildDirectionsUrl,
  buildCalendarUrl
} = eventsStore;

const emitSelect = (id: string) => {
  emit("select", id);
};
</script>
