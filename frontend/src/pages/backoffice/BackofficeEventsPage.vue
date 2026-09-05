<template>
  <section class="grid gap-8">
    <p
      v-if="draftLocationWarning"
      class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      {{ draftLocationWarning }}
    </p>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
        <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">{{ t("editor.myEventsEyebrow") }}</p>
        <h3 class="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{{ t("editor.myEventsTitle") }}</h3>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {{ t("editor.myEventsLead") }}
        </p>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)]">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.priorityActions") }}</p>
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            @click="goToCreate"
          >
            {{ t("editor.addEvent") }}
          </button>
          <button
            v-if="lastEditableEvent"
            type="button"
            class="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
            @click="editEvent(lastEditableEvent)"
          >
            {{ t("editor.resumeDraft") }}
          </button>
        </div>
        <div class="mt-5 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-4">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("editor.inProgress") }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">{{ inProgressEventsCount }}</p>
          </div>
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-4">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("editor.published") }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">{{ myPublishedEvents.length }}</p>
          </div>
          <div class="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-4">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("editor.feedback") }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">{{ rejectedEventsCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!canEdit" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">{{ t("common.accessDenied") }}</h3>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("editor.deniedLead") }}
      </p>
    </div>

    <div v-else class="grid gap-6">
      <p v-if="editorError" class="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ editorError }}
      </p>

      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.myDraftsEyebrow") }}</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">{{ t("editor.myDraftsTitle") }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {{ t("editor.myDraftsLead") }}
            </p>
          </div>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
            {{ t("editor.itemCount", myDraftEvents.length) }}
          </span>
        </div>

        <p v-if="deleteError && myDraftEvents.length > 0" class="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ deleteError }}
        </p>

        <div v-if="myDraftEvents.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          {{ t("editor.noMyDrafts") }}
        </div>
        <ul v-else class="mt-6 grid gap-4">
          <li
            v-for="eventItem in myDraftEvents"
            :key="eventItem.id"
            class="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5"
          >
            <article class="flex flex-col gap-4">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" :class="statusClasses(eventItem.status)">
                      {{ statusLabels[eventItem.status] }}
                    </span>
                    <span class="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {{ formatEventDateBadge(eventItem.occurrences) }}
                    </span>
                  </div>
                  <h4 class="mt-3 text-lg font-semibold text-slate-950">{{ eventItem.title }}</h4>
                  <p class="mt-2 text-sm text-slate-600">{{ formatEventLocation(eventItem) }}</p>
                  <p v-if="formatUpdatedAtLabel(eventItem.updatedAt)" class="mt-2 text-xs text-slate-400">
                    {{ formatUpdatedAtLabel(eventItem.updatedAt) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="canEditEvent(eventItem)"
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                    @click="editEvent(eventItem)"
                  >
                    {{ t("common.edit") }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    :disabled="!canSubmitForModeration(eventItem)"
                    @click="handleSubmitDraft(eventItem.id)"
                  >
                    {{ t("editor.submit") }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    @click="handleDelete(eventItem.id)"
                  >
                    {{ t("common.delete") }}
                  </button>
                </div>
              </div>
              <p
                v-if="hasApproximateGeolocation(eventItem)"
                class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700"
              >
                {{ t("editor.locationApproximateNotice") }}
              </p>
              <p
                v-else-if="!hasResolvedCoordinates(eventItem)"
                class="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700"
              >
                {{ t("editor.locationNeedsReview") }}
              </p>
              <p
                v-if="isEditLocked(eventItem)"
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                {{ t("editor.editLockedWhilePending") }}
              </p>
            </article>
          </li>
        </ul>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.editorialReviewEyebrow") }}</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">{{ t("editor.editorialReviewTitle") }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {{ t("editor.editorialReviewLead") }}
            </p>
          </div>
          <span class="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
            {{ t("editor.itemCount", myEditorialReviewEvents.length) }}
          </span>
        </div>

        <div v-if="myEditorialReviewEvents.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          {{ t("editor.noEditorialReview") }}
        </div>
        <ul v-else class="mt-6 grid gap-4">
          <li
            v-for="eventItem in myEditorialReviewEvents"
            :key="eventItem.id"
            class="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5"
          >
            <article class="flex flex-col gap-4">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" :class="statusClasses(eventItem.status)">
                      {{ statusLabels[eventItem.status] }}
                    </span>
                    <span class="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {{ formatEventDateBadge(eventItem.occurrences) }}
                    </span>
                  </div>
                  <h4 class="mt-3 text-lg font-semibold text-slate-950">{{ eventItem.title }}</h4>
                  <p class="mt-2 text-sm text-slate-600">{{ formatEventLocation(eventItem) }}</p>
                  <p v-if="formatUpdatedAtLabel(eventItem.updatedAt)" class="mt-2 text-xs text-slate-400">
                    {{ formatUpdatedAtLabel(eventItem.updatedAt) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="canEditEvent(eventItem)"
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                    @click="editEvent(eventItem)"
                  >
                    {{ t("common.edit") }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    :disabled="!canSubmitForModeration(eventItem)"
                    @click="handleSubmitDraft(eventItem.id)"
                  >
                    {{ t("editor.submit") }}
                  </button>
                </div>
              </div>
              <p
                v-if="hasApproximateGeolocation(eventItem)"
                class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700"
              >
                {{ t("editor.locationApproximateNotice") }}
              </p>
              <p
                v-else-if="!hasResolvedCoordinates(eventItem)"
                class="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700"
              >
                {{ t("editor.locationNeedsReview") }}
              </p>
              <p v-if="eventItem.rejectionReason" class="whitespace-pre-line rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {{ t("editor.rejectionReasonLabel", { reason: eventItem.rejectionReason }) }}
              </p>
            </article>
          </li>
        </ul>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.publicationsEyebrow") }}</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">{{ t("editor.publicationsTitle") }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {{ t("editor.publicationsLead") }}
            </p>
          </div>
          <span class="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            {{ t("editor.publishedCount", myPublishedEvents.length) }}
          </span>
        </div>

        <p v-if="deleteError" class="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ deleteError }}
        </p>

        <div v-if="myPublishedEvents.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          {{ t("editor.noPublished") }}
        </div>
        <ul v-else class="mt-6 grid gap-4">
          <li
            v-for="eventItem in myPublishedEvents"
            :key="eventItem.id"
            class="rounded-[1.5rem] border border-slate-200 bg-white p-5"
          >
            <article class="flex flex-col gap-4">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" :class="statusClasses(eventItem.status)">
                      {{ statusLabels[eventItem.status] }}
                    </span>
                    <span class="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {{ formatEventDateBadge(eventItem.occurrences) }}
                    </span>
                  </div>
                  <h4 class="mt-3 text-lg font-semibold text-slate-950">{{ eventItem.title }}</h4>
                  <p class="mt-2 text-sm text-slate-600">{{ formatEventLocation(eventItem) }}</p>
                  <p v-if="formatUpdatedAtLabel(eventItem.updatedAt)" class="mt-2 text-xs text-slate-400">
                    {{ formatUpdatedAtLabel(eventItem.updatedAt) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="canEditEvent(eventItem)"
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                    @click="editEvent(eventItem)"
                  >
                    {{ t("common.edit") }}
                  </button>
                  <button
                    v-if="canModerate && eventItem.status === 'PUBLISHED'"
                    type="button"
                    class="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                    @click="toggleFeatured(eventItem)"
                  >
                    {{ eventItem.featured ? t("moderation.removeFeatured") : t("moderation.markAsFeatured") }}
                  </button>
                  <button
                    v-if="canModerate"
                    type="button"
                    class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    @click="handleDelete(eventItem.id)"
                  >
                    {{ t("common.delete") }}
                  </button>
                </div>
              </div>
              <p
                v-if="eventItem.pendingRevision?.status === 'DRAFT'"
                class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700"
              >
                {{ t("editor.draftRevisionNotice") }}
              </p>
              <p
                v-else-if="eventItem.pendingRevision?.status === 'PENDING'"
                class="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700"
              >
                {{ t("editor.pendingRevisionNotice") }}
              </p>
              <p
                v-else-if="eventItem.pendingRevision?.status === 'REJECTED' && eventItem.pendingRevision.rejectionReason"
                class="whitespace-pre-line rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {{ t("editor.rejectedPublishedRevisionNotice", { reason: eventItem.pendingRevision.rejectionReason }) }}
              </p>
              <p
                v-if="isEditLocked(eventItem)"
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                {{ t("editor.editLockedWhilePending") }}
              </p>
            </article>
          </li>
        </ul>
      </div>

      <div
        v-if="showOtherArticles"
        class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.otherArticlesEyebrow") }}</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">{{ t("editor.otherArticlesTitle") }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {{ t("editor.otherArticlesLead") }}
            </p>
          </div>
          <span class="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
            {{ t("editor.itemCount", otherEditableEvents.length) }}
          </span>
        </div>

        <p v-if="deleteError" class="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ deleteError }}
        </p>

        <div v-if="otherEditableEvents.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          {{ t("editor.noOtherArticles") }}
        </div>
        <ul v-else class="mt-6 grid gap-4">
          <li
            v-for="eventItem in otherEditableEvents"
            :key="eventItem.id"
            class="rounded-[1.5rem] border border-slate-200 bg-white p-5"
          >
            <article class="flex flex-col gap-4">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" :class="statusClasses(eventItem.status)">
                      {{ statusLabels[eventItem.status] }}
                    </span>
                    <span class="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {{ formatEventDateBadge(eventItem.occurrences) }}
                    </span>
                  </div>
                  <h4 class="mt-3 text-lg font-semibold text-slate-950">{{ eventItem.title }}</h4>
                  <p class="mt-2 text-sm text-slate-600">{{ formatEventLocation(eventItem) }}</p>
                  <p v-if="formatUpdatedAtLabel(eventItem.updatedAt)" class="mt-2 text-xs text-slate-400">
                    {{ formatUpdatedAtLabel(eventItem.updatedAt) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <template v-if="eventItem.status === 'DRAFT' || eventItem.status === 'REJECTED'">
                    <button
                      v-if="canEditEvent(eventItem)"
                      type="button"
                      class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                      @click="editEvent(eventItem)"
                    >
                      {{ t("common.edit") }}
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      :disabled="!canSubmitForModeration(eventItem)"
                      @click="handleSubmitDraft(eventItem.id)"
                    >
                      {{ t("editor.submit") }}
                    </button>
                  </template>
                  <template v-else-if="eventItem.status === 'PUBLISHED'">
                    <button
                      v-if="canEditEvent(eventItem)"
                      type="button"
                      class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                      @click="editEvent(eventItem)"
                    >
                      {{ t("common.edit") }}
                    </button>
                    <button
                      v-if="canModerate"
                      type="button"
                      class="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                      @click="toggleFeatured(eventItem)"
                    >
                      {{ eventItem.featured ? t("moderation.removeFeatured") : t("moderation.markAsFeatured") }}
                    </button>
                    <button
                      type="button"
                      class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      @click="handleDelete(eventItem.id)"
                    >
                      {{ t("common.delete") }}
                    </button>
                  </template>
                </div>
              </div>
              <p
                v-if="(eventItem.status === 'DRAFT' || eventItem.status === 'REJECTED') && hasApproximateGeolocation(eventItem)"
                class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700"
              >
                {{ t("editor.locationApproximateNotice") }}
              </p>
              <p
                v-else-if="(eventItem.status === 'DRAFT' || eventItem.status === 'REJECTED') && !hasResolvedCoordinates(eventItem)"
                class="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700"
              >
                {{ t("editor.locationNeedsReview") }}
              </p>
              <p v-if="eventItem.rejectionReason" class="whitespace-pre-line rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {{ t("editor.rejectionReasonLabel", { reason: eventItem.rejectionReason }) }}
              </p>
              <p
                v-if="eventItem.pendingRevision?.status === 'DRAFT'"
                class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700"
              >
                {{ t("editor.draftRevisionNotice") }}
              </p>
              <p
                v-else-if="eventItem.pendingRevision?.status === 'PENDING'"
                class="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700"
              >
                {{ t("editor.pendingRevisionNotice") }}
              </p>
              <p
                v-else-if="eventItem.pendingRevision?.status === 'REJECTED' && eventItem.pendingRevision.rejectionReason"
                class="whitespace-pre-line rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {{ t("editor.rejectedPublishedRevisionNotice", { reason: eventItem.pendingRevision.rejectionReason }) }}
              </p>
              <p
                v-if="isEditLocked(eventItem)"
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                {{ t("editor.editLockedWhilePending") }}
              </p>
            </article>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useEditorStore } from "../../stores/editor";
import { useEventsStore } from "../../stores/events";
import type { EventItem } from "../../api/events";
import { formatEventDateBadge, getEventLocationSummary } from "../../utils/occurrences";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const editorStore = useEditorStore();
const eventsStore = useEventsStore();

const { canEdit, canModerate } = storeToRefs(authStore);
const {
  myDraftEvents,
  myEditorialReviewEvents,
  myPublishedEvents,
  publishedRevisionDraftEvents,
  publishedRevisionPendingEvents,
  publishedRevisionRejectedEvents,
  otherEditableEvents,
  deleteError
} =
  storeToRefs(eventsStore);
const { editorError } = storeToRefs(editorStore);
const { handleDelete, formatUpdatedAtLabel, handleUpdateFeatured } = eventsStore;
const { handleSubmitDraft } = editorStore;

const statusLabels = computed<Record<string, string>>(() => ({
  DRAFT: t("editor.status.DRAFT"),
  REJECTED: t("editor.status.REJECTED"),
  PENDING: t("editor.status.PENDING"),
  PUBLISHED: t("editor.status.PUBLISHED")
}));

const inProgressEventsCount = computed(
  () =>
    myDraftEvents.value.length +
    myEditorialReviewEvents.value.length +
    publishedRevisionDraftEvents.value.length +
    publishedRevisionPendingEvents.value.length +
    publishedRevisionRejectedEvents.value.length
);
const rejectedEventsCount = computed(
  () => myEditorialReviewEvents.value.length + publishedRevisionRejectedEvents.value.length
);
const isEditLocked = (eventItem: EventItem) =>
  eventItem.status === "PENDING" || eventItem.pendingRevision?.status === "PENDING";

const canEditEvent = (eventItem: EventItem) => !isEditLocked(eventItem);
const formatEventLocation = (eventItem: EventItem) => getEventLocationSummary(eventItem.occurrences);

const lastEditableEvent = computed(
  () =>
    myDraftEvents.value[0] ??
    myEditorialReviewEvents.value[0] ??
    myPublishedEvents.value.find((eventItem) => canEditEvent(eventItem)) ??
    null
);
const showOtherArticles = computed(() => canModerate.value);
const draftLocationWarning = computed(() =>
  route.query.saved === "draft"
    ? route.query.location === "approximate"
      ? t("editor.locationSavedAsApproximate")
      : route.query.location === "unresolved"
        ? t("editor.locationSavedAsDraft")
        : ""
    : ""
);

const hasResolvedCoordinates = (eventItem: EventItem) => eventsStore.hasResolvedCoordinates(eventItem);
const hasApproximateGeolocation = (eventItem: EventItem) => eventsStore.hasApproximateGeolocation(eventItem);
const canSubmitForModeration = (eventItem: EventItem) => eventsStore.canSubmitForModeration(eventItem);

const statusClasses = (status: string) => {
  if (status === "REJECTED") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "PENDING") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "PUBLISHED") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border border-sky-200 bg-sky-50 text-sky-700";
};

const goToCreate = () => {
  router.push("/backoffice/events/new");
};

const editEvent = (eventItem: EventItem) => {
  if (!canEditEvent(eventItem)) {
    return;
  }
  editorStore.startEdit(eventItem);
  router.push("/backoffice/events/new");
};

const toggleFeatured = (eventItem: EventItem) => {
  handleUpdateFeatured(eventItem.id, eventItem.featured !== true);
};
</script>
