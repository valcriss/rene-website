<template>
  <div class="space-y-5" data-testid="seo-preview-card">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {{ t("editor.seoPreviewSearchEyebrow") }}
      </p>
      <div class="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
        <p class="truncate text-xs text-emerald-700" data-testid="seo-preview-domain">{{ fakeResultUrl }}</p>
        <p class="mt-1 truncate text-lg text-sky-800" data-testid="seo-preview-title">{{ effectiveTitle }}</p>
        <p class="mt-1 line-clamp-2 text-sm text-slate-600" data-testid="seo-preview-description">
          {{ effectiveDescription }}
        </p>
      </div>
    </div>

    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {{ t("editor.seoPreviewSocialEyebrow") }}
      </p>
      <div class="mt-2 flex overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <img
          class="h-24 w-24 flex-none object-cover"
          :src="previewImage"
          :alt="imageAlt || effectiveTitle"
          data-testid="seo-preview-image"
        />
        <div class="min-w-0 flex-1 p-3">
          <p class="truncate text-xs uppercase tracking-wide text-slate-400">{{ fakeResultUrl }}</p>
          <p class="mt-1 truncate text-sm font-semibold text-slate-900">{{ effectiveTitle }}</p>
          <p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ effectiveDescription }}</p>
        </div>
      </div>
    </div>

    <ul v-if="alerts.length > 0" class="space-y-2" data-testid="seo-alerts">
      <li
        v-for="alert in alerts"
        :key="alert"
        class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        :data-testid="`seo-alert-${alert}`"
      >
        <font-awesome-icon class="mt-0.5 h-3.5 w-3.5 flex-none" :icon="faTriangleExclamation" />
        <span>{{ t(`editor.seoAlerts.${alert}`) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { computeSeoDescription, computeSeoTitle, DEFAULT_OG_IMAGE_PATH } from "../../utils/seo";
import { computeSeoAlerts, type SeoAlertOccurrence } from "../../utils/seoAlerts";
import { useSiteUrl } from "../../composables/useSiteUrl";

const props = defineProps<{
  title: string;
  content: string | null;
  image: string | null;
  imageAlt: string | null;
  seoTitleOverride: string | null;
  seoDescriptionOverride: string | null;
  occurrences: SeoAlertOccurrence[];
  siteName: string;
}>();

const { t } = useI18n();

// Derived from the real site URL rather than guessed from the site name (which previously
// hardcoded a ".fr" TLD, wrong for r3ne.art) — this preview must show the actual domain.
const siteUrl = useSiteUrl();
const siteDomain = computed(
  () => siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") || props.siteName.toLowerCase().replace(/\s+/g, "")
);
const fakeResultUrl = computed(() => `${siteDomain.value} › evenements › ...`);

const effectiveTitle = computed(() =>
  computeSeoTitle({ title: props.title, seoTitleOverride: props.seoTitleOverride }, props.siteName)
);

const effectiveDescription = computed(() =>
  computeSeoDescription({ content: props.content, seoDescriptionOverride: props.seoDescriptionOverride })
);

const previewImage = computed(() => props.image || DEFAULT_OG_IMAGE_PATH);

const alerts = computed(() =>
  computeSeoAlerts({
    title: props.title,
    description: effectiveDescription.value,
    image: props.image,
    occurrences: props.occurrences
  })
);
</script>
