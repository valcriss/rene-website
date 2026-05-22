<template>
  <section class="grid gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.formEyebrow") }}</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-950">
          {{ editorMode === "edit" ? t("editor.editTitle") : t("editor.addTitle") }}
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          {{ modeDescription }}
        </p>
      </div>
      <button
        type="button"
        class="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900"
        @click="goToEvents"
      >
        {{ t("editor.backToEvents") }}
      </button>
    </div>

    <div v-if="!canEdit" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">{{ t("common.accessDenied") }}</h3>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("editor.deniedCreateLead") }}
      </p>
    </div>

    <div v-else class="grid gap-6" data-testid="editor-form">
      <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.95),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-3xl">
            <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">{{ t("editor.currentMode") }}</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">
              {{ editorMode === "edit" ? t("editor.editModeTitle") : t("editor.createModeTitle") }}
            </h3>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              {{ t("editor.modeLead") }}
            </p>
          </div>
          <button
            v-if="editorMode === 'edit'"
            type="button"
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900"
            @click="resetEditorForm"
          >
            {{ t("editor.newDraft") }}
          </button>
        </div>
      </div>

      <div
        v-if="editingPublishedEvent"
        class="rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-5 text-sm text-amber-800"
      >
        {{ publishedEditLead }}
      </div>

      <div v-if="editorError" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ editorError }}
      </div>

      <div class="grid gap-6">
          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.identityEyebrow") }}</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.identityTitle") }}</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600 md:col-span-2">
                {{ t("common.title") }}
                <input
                  v-model="editorForm.title"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :placeholder="t('editor.placeholders.title')"
                />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.category") }}
                <select
                  v-model="editorForm.categoryId"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :disabled="categoriesLoading"
                >
                  <option value="">{{ t("editor.selectCategory") }}</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
                <p v-if="categoriesLoading" class="mt-2 text-xs text-slate-500">
                  {{ t("editor.loadingCategories") }}
                </p>
                <p v-else-if="categories.length === 0" class="mt-2 text-xs text-slate-500">
                  {{ t("editor.noCategories") }}
                </p>
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.audience") }}
                <select
                  v-model="editorForm.audienceId"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :disabled="audiencesLoading"
                >
                  <option value="">{{ t("editor.selectAudience") }}</option>
                  <option v-for="audience in audiences" :key="audience.id" :value="audience.id">
                    {{ audience.name }}
                  </option>
                </select>
                <p v-if="audiencesLoading" class="mt-2 text-xs text-slate-500">
                  {{ t("editor.loadingAudiences") }}
                </p>
                <p v-else-if="audiences.length === 0" class="mt-2 text-xs text-slate-500">
                  {{ t("editor.noAudiences") }}
                </p>
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.image") }}
                <input
                  type="file"
                  accept="image/*"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  @change="handleImageChange"
                />
                <p v-if="editorForm.image" class="mt-2 text-xs text-slate-500">
                  {{ t("editor.currentImage", { image: editorForm.image }) }}
                </p>
              </label>
            </div>
          </section>

          <section class="rounded-[2rem] border border-sky-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-6 shadow-[0_28px_72px_-44px_rgba(15,23,42,0.26)] sm:p-7">
            <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">{{ t("editor.contentEyebrow") }}</p>
            <div class="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div class="max-w-3xl">
                <h3 class="text-2xl font-semibold tracking-tight text-slate-950">{{ t("editor.contentTitle") }}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-600">
                  {{ t("editor.contentLead") }}
                </p>
              </div>
            </div>
            <div class="mt-6 text-sm text-slate-600">
              <RichTextEditor v-model="editorForm.content" />
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.scheduleEyebrow") }}</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.scheduleTitle") }}</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600">
                {{ t("common.start") }}
                <input v-model="editorForm.eventStartAt" type="datetime-local" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.end") }}
                <input v-model="editorForm.eventEndAt" type="datetime-local" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </label>
              <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
                <input v-model="editorForm.allDay" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-slate-900" />
                {{ t("editor.allDay") }}
              </label>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.locationEyebrow") }}</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.locationTitle") }}</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600 md:col-span-2">
                {{ t("common.venue") }}
                <input v-model="editorForm.venueName" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" :placeholder="t('editor.placeholders.venue')" />
              </label>
              <label class="text-sm text-slate-600 md:col-span-2">
                {{ t("common.address") }}
                <input v-model="editorForm.address" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" :placeholder="t('editor.placeholders.address')" />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.postalCode") }}
                <input v-model="editorForm.postalCode" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.city") }}
                <input v-model="editorForm.city" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </label>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.organizerEyebrow") }}</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.organizerTitle") }}</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600">
                {{ t("common.organizer") }}
                <input v-model="editorForm.organizerName" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" :placeholder="t('editor.placeholders.organizer')" />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("detail.organizerWebsite") }}
                <input v-model="editorForm.organizerUrl" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="https://..." />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.email") }}
                <input v-model="editorForm.contactEmail" type="email" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="contact@exemple.fr" />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.phone") }}
                <input v-model="editorForm.contactPhone" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" :placeholder="t('editor.placeholders.phone')" />
              </label>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.usefulLinksEyebrow") }}</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.usefulLinksTitle") }}</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600">
                {{ t("common.ticketing") }}
                <input v-model="editorForm.ticketUrl" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="https://..." />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.website") }}
                <input v-model="editorForm.websiteUrl" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="https://..." />
              </label>
              <div class="text-sm text-slate-600 md:col-span-2">
                <span>{{ t("editor.pricingInfoTitle") }}</span>
                <p class="mt-1 text-xs leading-5 text-slate-500">{{ t("editor.pricingInfoLead") }}</p>
                <div class="mt-2">
                  <RichTextEditor
                    v-model="editorForm.pricingInfo"
                    :allow-images="false"
                    :compact="true"
                    :aria-label="t('editor.pricingInfoTitle')"
                  />
                </div>
              </div>
            </div>
          </section>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)]">
        <div class="space-y-5">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-sky-100/70">{{ t("editor.actionsEyebrow") }}</p>
            <p class="mt-2 text-sm text-slate-300">
              {{ t("editor.actionsLead") }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-white/5"
              @click="handlePreview"
            >
              {{ t("editor.previewArticle") }}
            </button>
            <button
              type="button"
              class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-50"
              :disabled="isPersisting"
              @click="handleSaveAndRedirect"
            >
              {{ primaryActionLabel }}
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-white/5"
              :disabled="isPersisting"
              @click="handleSubmitAndRedirect"
            >
              {{ t("editor.submitForModeration") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import RichTextEditor from "../../components/form/RichTextEditor.vue";
import { useAuthStore } from "../../stores/auth";
import { useAudiencesStore } from "../../stores/audiences";
import { useCategoriesStore } from "../../stores/categories";
import { useEditorStore } from "../../stores/editor";

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const categoriesStore = useCategoriesStore();
const audiencesStore = useAudiencesStore();
const editorStore = useEditorStore();

const { canEdit } = storeToRefs(authStore);
const { categories, loading: categoriesLoading } = storeToRefs(categoriesStore);
const { audiences, loading: audiencesLoading } = storeToRefs(audiencesStore);
const { editorMode, editingPublishedEvent, editingPublishedRevisionStatus, editorError, editorForm, isPersisting } = storeToRefs(editorStore);

const { resetEditorForm, saveDraftAndReturn, handleSaveAndSubmit, savePreviewSnapshot, setImageFile } = editorStore;

const hasResolvedCoordinates = (event: { latitude: number | null; longitude: number | null }) =>
  typeof event.latitude === "number" &&
  Number.isFinite(event.latitude) &&
  typeof event.longitude === "number" &&
  Number.isFinite(event.longitude);

const getLocationQuery = (event: {
  latitude: number | null;
  longitude: number | null;
  geolocationPrecision?: "EXACT" | "APPROXIMATE" | "UNRESOLVED";
}) => {
  if (!hasResolvedCoordinates(event)) {
    return { location: "unresolved", saved: "draft" };
  }

  if (event.geolocationPrecision === "APPROXIMATE") {
    return { location: "approximate", saved: "draft" };
  }

  return {};
};

const modeDescription = computed(() =>
  editingPublishedEvent.value
    ? t("editor.editPublishedDescription")
    : editorMode.value === "edit"
      ? t("editor.editDescription")
      : t("editor.createDescription")
);

const primaryActionLabel = computed(() => {
  if (editingPublishedEvent.value) {
    return t("editor.saveDraft");
  }

  return editorMode.value === "edit" ? t("common.update") : t("editor.saveDraft");
});

const publishedEditLead = computed(() => {
  if (editingPublishedRevisionStatus.value === "DRAFT") {
    return t("editor.editPublishedDraftLead");
  }
  if (editingPublishedRevisionStatus.value === "REJECTED") {
    return t("editor.editPublishedRejectedLead");
  }
  if (editingPublishedRevisionStatus.value === "PENDING") {
    return t("editor.editPublishedPendingLead");
  }
  return t("editor.editPublishedLead");
});

onMounted(() => {
  categoriesStore.loadCategories();
  audiencesStore.loadAudiences();
});

const goToEvents = () => {
  router.push("/backoffice/events");
};

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  setImageFile(file);
};

const handleSaveAndRedirect = async () => {
  const savedEvent = await saveDraftAndReturn();
  if (savedEvent) {
    router.push({
      path: "/backoffice/events",
      query: getLocationQuery(savedEvent)
    });
  }
};

const handleSubmitAndRedirect = async () => {
  const ok = await handleSaveAndSubmit();
  if (ok) {
    router.push("/backoffice/events");
  }
};

const handlePreview = () => {
  const token = savePreviewSnapshot();
  const previewRoute = router.resolve({
    name: "backoffice-events-preview",
    query: { preview: token }
  });
  window.open(previewRoute.href, "_blank", "noopener");
};
</script>
