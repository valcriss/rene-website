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
            @click="handleNewDraft"
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

      <Teleport to="body">
        <div
          v-if="editorError"
          class="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-[0_20px_45px_-20px_rgba(190,18,60,0.45)] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
          role="alert"
        >
          {{ editorError }}
        </div>
      </Teleport>

      <div v-if="validationAttempted && validationIssues.length" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert" data-testid="editor-validation-summary">
        <p class="font-semibold">{{ t("editor.validationSummary") }}</p>
        <ul class="mt-2 list-inside list-disc space-y-1">
          <li v-for="issue in validationIssues" :key="issue.id">
            <button type="button" class="text-left underline underline-offset-2 hover:text-rose-950" @click="focusIssue(issue)">{{ issue.label }}</button>
          </li>
        </ul>
      </div>

      <div class="grid gap-6">
          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.identityEyebrow") }}</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.identityTitle") }}</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600 md:col-span-2">
                {{ t("common.title") }}
                <input
                  id="editor-title"
                  v-model="editorForm.title"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :placeholder="t('editor.placeholders.title')"
                />
                <p v-if="hasIssue('editor-title')" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.category") }}
                <select
                  id="editor-category"
                  v-model="editorForm.categoryId"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :disabled="categoriesLoading"
                >
                  <option value="">{{ t("editor.selectCategory") }}</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
                <p v-if="hasIssue('editor-category')" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
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
                  id="editor-audience"
                  v-model="editorForm.audienceId"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :disabled="audiencesLoading"
                >
                  <option value="">{{ t("editor.selectAudience") }}</option>
                  <option v-for="audience in audiences" :key="audience.id" :value="audience.id">
                    {{ audience.name }}
                  </option>
                </select>
                <p v-if="hasIssue('editor-audience')" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
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
                  id="editor-image"
                  ref="imageInputRef"
                  type="file"
                  accept="image/*"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  @change="handleImageChange"
                />
                <p v-if="hasIssue('editor-image')" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
                <div v-if="imagePreviewUrl || editorForm.image" class="mt-3 flex items-center gap-3">
                  <img
                    :src="imagePreviewUrl || editorForm.image || ''"
                    alt=""
                    class="h-16 w-24 flex-none rounded-xl border border-slate-200 object-cover"
                  />
                  <p class="text-xs font-medium text-emerald-700" data-testid="editor-image-selected">
                    {{ imagePreviewUrl ? t("editor.imageSelected") : t("editor.currentImage", { image: editorForm.image }) }}
                  </p>
                </div>
              </label>
              <label class="text-sm text-slate-600 md:col-span-2">
                {{ t("editor.imageAlt") }}
                <input
                  id="editor-image-alt"
                  v-model="editorForm.imageAlt"
                  type="text"
                  maxlength="200"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :placeholder="t('editor.placeholders.imageAlt')"
                  data-testid="editor-image-alt"
                />
                <p v-if="hasIssue('editor-image-alt')" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
                <p class="mt-2 text-xs text-slate-500">{{ t("editor.imageAltHelp") }}</p>
              </label>
            </div>
          </section>

          <section id="editor-content" class="rounded-[2rem] border border-sky-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-6 shadow-[0_28px_72px_-44px_rgba(15,23,42,0.26)] sm:p-7">
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
              <p v-if="hasIssue('editor-content')" class="mt-2 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.scheduleEyebrow") }}</p>
                <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.occurrencesTitle") }}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-500">{{ t("editor.locationLead") }}</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900"
                @click="addOccurrence"
              >
                {{ t("editor.addOccurrence") }}
              </button>
            </div>

            <div class="mt-5 grid gap-5">
              <div
                v-for="(occurrence, index) in editorForm.occurrences"
                :key="index"
                class="rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-5"
                :data-testid="`occurrence-row-${index}`"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    class="min-w-0 text-left text-sm font-semibold text-slate-700 hover:text-sky-800"
                    :aria-expanded="occurrencePanels[index]?.open ?? true"
                    :aria-controls="`occurrence-fields-${index}`"
                    @click="toggleOccurrence(index)"
                  >
                    {{ t("editor.occurrenceLabel", { index: index + 1 }) }} · {{ occurrenceSummary(occurrence) }}
                    <span class="ml-2 text-xs font-normal text-sky-700">{{ occurrencePanels[index]?.open ? t("editor.collapseSection") : t("editor.expandSection") }}</span>
                  </button>
                  <button
                    v-if="editorForm.occurrences.length > 1"
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    @click="removeOccurrence(index)"
                  >
                    {{ t("editor.removeOccurrence") }}
                  </button>
                </div>

                <div v-show="occurrencePanels[index]?.open ?? true" :id="`occurrence-fields-${index}`">
                  <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <label class="text-sm text-slate-600">
                    {{ t("common.start") }}
                    <input :id="`editor-occurrence-${index}-start`" v-model="occurrence.eventStartAt" type="date" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                    <p v-if="hasIssue(`editor-occurrence-${index}-start`)" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
                  </label>
                  <label class="text-sm text-slate-600">
                    {{ t("common.end") }}
                    <input :id="`editor-occurrence-${index}-end`" v-model="occurrence.eventEndAt" type="date" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                    <p v-if="hasIssue(`editor-occurrence-${index}-end`)" class="mt-1 text-xs text-rose-700">{{ occurrence.eventStartAt && occurrence.eventEndAt ? t("editor.invalidDateRange") : t("editor.requiredField") }}</p>
                  </label>
                  <label class="text-sm text-slate-600 md:col-span-2">
                    {{ t("common.venue") }}
                    <input v-model="occurrence.venueName" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" :placeholder="t('editor.placeholders.venue')" />
                  </label>
                  <label class="text-sm text-slate-600 md:col-span-2">
                    {{ t("common.address") }}
                    <input v-model="occurrence.address" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" :placeholder="t('editor.placeholders.address')" />
                  </label>
                  <label class="text-sm text-slate-600">
                    {{ t("common.postalCode") }}
                    <input
                      :id="`editor-occurrence-${index}-postal`"
                      v-model="occurrence.postalCode"
                      type="text"
                      inputmode="numeric"
                      maxlength="5"
                      class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      :placeholder="t('editor.placeholders.postalCode')"
                      :data-testid="`occurrence-postal-code-${index}`"
                      @input="onPostalCodeInput(index)"
                    />
                    <p v-if="hasIssue(`editor-occurrence-${index}-postal`)" class="mt-1 text-xs text-rose-700">{{ t("editor.postalCodeForCity") }}</p>
                  </label>
                  <label class="text-sm text-slate-600">
                    {{ t("common.city") }}
                    <select
                      :id="`editor-occurrence-${index}-city`"
                      v-model="occurrence.city"
                      class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      :disabled="cityOptions(index).length === 0"
                      :data-testid="`occurrence-city-select-${index}`"
                    >
                      <option value="">{{ cityPlaceholder(index) }}</option>
                      <option v-for="option in cityOptions(index)" :key="option" :value="option">{{ option }}</option>
                    </select>
                    <p v-if="hasIssue(`editor-occurrence-${index}-city`)" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
                    <p v-if="communesLoading(index)" class="mt-2 text-xs text-slate-500">{{ t("editor.communesLoading") }}</p>
                    <p v-else-if="communesError(index)" class="mt-2 text-xs text-rose-600">{{ communesError(index) }}</p>
                    <p v-else-if="isPostalCodeComplete(index) && cityOptions(index).length === 0" class="mt-2 text-xs text-slate-500">
                      {{ t("editor.communesNoMatch") }}
                    </p>
                  </label>
                </div>

                <div class="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ t("editor.geolocationStatus") }}</p>
                      <span class="mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" :class="geolocationStatusClass(index)">
                        {{ geolocationStatusLabel(index) }}
                      </span>
                    </div>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" :checked="useManualLocation[index]" @change="onManualLocationToggle(index, $event)" />
                      {{ t("editor.manualLocationToggle") }}
                    </label>
                  </div>
                  <p class="mt-2 text-xs text-slate-400">{{ t("editor.manualLocationHint") }}</p>
                  <div v-if="useManualLocation[index]" class="mt-4 grid gap-4 sm:grid-cols-2">
                    <label class="text-sm text-slate-600">
                      {{ t("common.latitude") }}
                      <input v-model.number="occurrence.latitude" type="number" step="any" min="-90" max="90" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                    <label class="text-sm text-slate-600">
                      {{ t("common.longitude") }}
                      <input v-model.number="occurrence.longitude" type="number" step="any" min="-180" max="180" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.organizerEyebrow") }}</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.organizerTitle") }}</h3>
            <div class="mt-5">
              <label class="block text-sm text-slate-600">
                {{ t("common.organizer") }}
                <input id="editor-organizer" v-model="editorForm.organizerName" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" :placeholder="t('editor.placeholders.organizer')" />
                <p v-if="hasIssue('editor-organizer')" class="mt-1 text-xs text-rose-700">{{ t("editor.requiredField") }}</p>
              </label>
            </div>
            <button type="button" class="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50" :aria-expanded="contactsOpen" aria-controls="editor-contacts-fields" @click="contactsOpen = !contactsOpen">
              <span>{{ t("editor.optionalContacts") }} · {{ contactsSummary }}</span>
              <span class="text-sky-700">{{ contactsOpen ? t("editor.collapseSection") : t("editor.expandSection") }}</span>
            </button>
            <div v-show="contactsOpen" id="editor-contacts-fields" class="mt-4 grid gap-4 md:grid-cols-2">
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
            <button type="button" class="mt-2 flex w-full items-center justify-between gap-3 text-left" :aria-expanded="linksOpen" aria-controls="editor-links-fields" @click="linksOpen = !linksOpen">
              <span><span class="block text-lg font-semibold text-slate-950">{{ t("editor.usefulLinksTitle") }}</span><span class="mt-1 block text-sm text-slate-500">{{ linksSummary }}</span></span>
              <span class="text-sm text-sky-700">{{ linksOpen ? t("editor.collapseSection") : t("editor.expandSection") }}</span>
            </button>
            <div v-show="linksOpen" id="editor-links-fields" class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600">
                {{ t("common.ticketing") }}
                <input v-model="editorForm.ticketUrl" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="https://..." />
              </label>
              <label class="text-sm text-slate-600">
                {{ t("common.website") }}
                <input v-model="editorForm.websiteUrl" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="https://..." />
              </label>
              <div class="text-sm text-slate-600 md:col-span-2">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span>{{ t("editor.socialLinksTitle") }}</span>
                    <p class="mt-1 text-xs leading-5 text-slate-500">{{ t("editor.socialLinksLead") }}</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900"
                    @click="addSocialLink"
                  >
                    {{ t("editor.addSocialLink") }}
                  </button>
                </div>

                <div v-if="editorForm.socialLinks.length > 0" class="mt-4 grid gap-3">
                  <div
                    v-for="(socialLink, index) in editorForm.socialLinks"
                    :key="`${socialLink.type}-${index}`"
                    class="grid gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[12rem_minmax(0,1fr)_auto] md:items-end"
                    :data-testid="`social-link-row-${index}`"
                  >
                    <label class="text-sm text-slate-600">
                      {{ t("editor.socialNetwork") }}
                      <select
                        :value="socialLink.type"
                        class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        @change="updateSocialLink(index, 'type', ($event.target as HTMLSelectElement).value)"
                      >
                        <option
                          v-for="option in socialLinkTypeOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                    </label>
                    <label class="text-sm text-slate-600">
                      {{ t("editor.socialLinkUrl") }}
                      <input
                        :value="socialLink.url"
                        type="url"
                        class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="https://..."
                        @input="updateSocialLink(index, 'url', ($event.target as HTMLInputElement).value)"
                      />
                    </label>
                    <button
                      type="button"
                      class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      @click="removeSocialLink(index)"
                    >
                      {{ t("editor.removeSocialLink") }}
                    </button>
                  </div>
                </div>
              </div>
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

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]" data-testid="editor-seo-section">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("editor.seoEyebrow") }}</p>
            <button type="button" class="mt-2 flex w-full items-center justify-between gap-3 text-left" :aria-expanded="seoOpen" aria-controls="editor-seo-fields" data-testid="editor-seo-toggle" @click="seoOpen = !seoOpen">
              <span><span class="block text-lg font-semibold text-slate-950">{{ t("editor.seoTitle") }}</span><span class="mt-1 block text-sm text-slate-500">{{ seoSummary }}<span v-if="seoAlerts.length" class="ml-2 text-amber-700">· {{ t("editor.alertCount", { count: seoAlerts.length }) }}</span></span></span>
              <span class="text-sm text-sky-700">{{ seoOpen ? t("editor.collapseSection") : t("editor.expandSection") }}</span>
            </button>
            <div v-show="seoOpen" id="editor-seo-fields">
            <p class="mt-2 text-sm text-slate-500">{{ t("editor.seoLead") }}</p>

            <div class="mt-5 grid gap-6 lg:grid-cols-2">
              <div class="grid gap-4">
                <label class="text-sm text-slate-600">
                  {{ t("editor.seoTitleOverride") }}
                  <input
                    v-model="editorForm.seoTitleOverride"
                    type="text"
                    maxlength="70"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    :placeholder="t('editor.placeholders.seoTitleOverride')"
                    data-testid="editor-seo-title-override"
                  />
                  <p class="mt-1 text-xs text-slate-400" data-testid="seo-title-counter">
                    {{ t("editor.characterCount", { count: (editorForm.seoTitleOverride ?? "").length, max: 70 }) }}
                  </p>
                </label>
                <label class="text-sm text-slate-600">
                  {{ t("editor.seoDescriptionOverride") }}
                  <textarea
                    v-model="editorForm.seoDescriptionOverride"
                    rows="3"
                    maxlength="160"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    :placeholder="t('editor.placeholders.seoDescriptionOverride')"
                    data-testid="editor-seo-description-override"
                  ></textarea>
                  <p class="mt-1 text-xs text-slate-400" data-testid="seo-description-counter">
                    {{ t("editor.characterCount", { count: (editorForm.seoDescriptionOverride ?? "").length, max: 160 }) }}
                  </p>
                </label>
              </div>

              <SeoPreviewCard
                :title="editorForm.title"
                :content="editorForm.content ?? null"
                :image="imagePreviewUrl || editorForm.image || null"
                :image-alt="editorForm.imageAlt ?? null"
                :seo-title-override="editorForm.seoTitleOverride ?? null"
                :seo-description-override="editorForm.seoDescriptionOverride ?? null"
                :occurrences="editorForm.occurrences"
                :site-name="t('navigation.title')"
              />
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
              class="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-white/5"
              :disabled="isBuildingPreview"
              @click="handlePreview"
            >
              <LoadingSpinner v-if="isBuildingPreview" size="sm" />
              <span>{{ t("editor.previewArticle") }}</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-slate-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              :disabled="isPersisting || !hasTitle"
              @click="handleSaveAndRedirect"
            >
              <LoadingSpinner v-if="isSavingDraft" size="sm" />
              <span>{{ primaryActionLabel }}</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-50"
              :disabled="isPersisting"
              @click="handleSubmitAndRedirect"
            >
              <LoadingSpinner v-if="isSubmittingForModeration" size="sm" />
              <span>{{ t("editor.submitForModeration") }}</span>
            </button>
            <button
              v-if="canModerate"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-emerald-400 px-5 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-900/40"
              :disabled="isPersisting"
              @click="handlePublishAndRedirect"
            >
              <LoadingSpinner v-if="isPublishingDirectly" size="sm" />
              <span>{{ t("editor.publishDirectly") }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <ImageCropModal :file="pendingCropFile" @confirm="handleCropConfirm" @cancel="handleCropCancel" />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import type { EventOccurrenceInput, SocialLinkType } from "../../api/events";
import { computeSeoDescription } from "../../utils/seo";
import { computeSeoAlerts } from "../../utils/seoAlerts";
import RichTextEditor from "../../components/form/RichTextEditor.vue";
import ImageCropModal from "../../components/form/ImageCropModal.vue";
import SeoPreviewCard from "../../components/form/SeoPreviewCard.vue";
import LoadingSpinner from "../../components/LoadingSpinner.vue";
import { useAuthStore } from "../../stores/auth";
import { useAudiencesStore } from "../../stores/audiences";
import { useCategoriesStore } from "../../stores/categories";
import { useCommunesStore } from "../../stores/communes";
import { useEditorStore } from "../../stores/editor";
import { useEventsStore } from "../../stores/events";
import type { EventItem } from "../../api/events";

const router = useRouter();
const { t, locale } = useI18n();
const authStore = useAuthStore();
const categoriesStore = useCategoriesStore();
const audiencesStore = useAudiencesStore();
const communesStore = useCommunesStore();
const editorStore = useEditorStore();
const eventsStore = useEventsStore();

const { canEdit, canModerate } = storeToRefs(authStore);
const { categories, loading: categoriesLoading } = storeToRefs(categoriesStore);
const { audiences, loading: audiencesLoading } = storeToRefs(audiencesStore);
const {
  editorMode,
  editingPublishedEvent,
  editingPublishedRevisionStatus,
  editorError,
  editorForm,
  imagePreviewUrl,
  isPersisting,
  isSavingDraft,
  isSubmittingForModeration,
  isPublishingDirectly,
  useManualLocation,
  lastGeolocationPrecision
} = storeToRefs(editorStore);

const {
  resetEditorForm,
  saveDraftAndReturn,
  handleSaveAndSubmit,
  handleSaveAndPublish,
  savePreviewSnapshot,
  setImageFile,
  addSocialLink,
  removeSocialLink,
  updateSocialLink,
  setManualLocation,
  addOccurrence,
  removeOccurrence
} = editorStore;

const contactsOpen = ref(false);
const linksOpen = ref(false);
const seoOpen = ref(false);
const validationAttempted = ref(false);
const occurrencePanels = ref<Array<{ item: EventOccurrenceInput; open: boolean }>>([]);

const isCompleteOccurrence = (occurrence: EventOccurrenceInput) =>
  Boolean(occurrence.eventStartAt && occurrence.eventEndAt && occurrence.eventEndAt >= occurrence.eventStartAt && occurrence.city?.trim());

watch(
  () => editorForm.value.occurrences.slice(),
  (items) => {
    const previous = occurrencePanels.value;
    occurrencePanels.value = items.map((item) => ({
      item,
      open: previous.find((panel) => panel.item === item)?.open ?? !isCompleteOccurrence(item)
    }));
  },
  { immediate: true }
);

const toggleOccurrence = (index: number) => {
  const panel = occurrencePanels.value[index];
  if (panel) panel.open = !panel.open;
};

const occurrenceSummary = (occurrence: EventOccurrenceInput) => {
  const date = occurrence.eventStartAt
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(`${occurrence.eventStartAt.slice(0, 10)}T12:00:00`))
    : t("editor.dateToComplete");
  const place = [occurrence.venueName, occurrence.city].filter(Boolean).join(", ");
  return place ? `${date} · ${place}` : date;
};

const filledSummary = (labels: string[]) => labels.length ? labels.join(" · ") : t("editor.noOptionalInfo");
const contactsSummary = computed(() => filledSummary([
  editorForm.value.organizerUrl?.trim() && t("detail.organizerWebsite"),
  editorForm.value.contactEmail?.trim() && t("common.email"),
  editorForm.value.contactPhone?.trim() && t("common.phone")
].filter((value): value is string => Boolean(value))));
const linksSummary = computed(() => filledSummary([
  editorForm.value.ticketUrl?.trim() && t("common.ticketing"),
  editorForm.value.websiteUrl?.trim() && t("common.website"),
  editorForm.value.socialLinks?.length && t("editor.socialLinksTitle"),
  editorForm.value.pricingInfo?.trim() && t("editor.pricingInfoTitle")
].filter((value): value is string => typeof value === "string" && Boolean(value))));
const seoSummary = computed(() =>
  editorForm.value.seoTitleOverride?.trim() || editorForm.value.seoDescriptionOverride?.trim()
    ? t("editor.seoCustomized")
    : t("editor.seoAutomatic")
);
const seoAlerts = computed(() => computeSeoAlerts({
  title: editorForm.value.title,
  description: computeSeoDescription(editorForm.value),
  image: imagePreviewUrl.value || editorForm.value.image,
  occurrences: editorForm.value.occurrences
}));

type ValidationIssue = { id: string; label: string; occurrenceIndex?: number };
const validationIssues = computed<ValidationIssue[]>(() => {
  const form = editorForm.value;
  const issues: ValidationIssue[] = [];
  const add = (id: string, label: string, occurrenceIndex?: number) => issues.push({ id, label, occurrenceIndex });
  if (!form.title?.trim()) add("editor-title", t("common.title"));
  if (!form.categoryId?.trim()) add("editor-category", t("common.category"));
  if (!form.audienceId?.trim()) add("editor-audience", t("common.audience"));
  if (!imagePreviewUrl.value && !form.image?.trim()) add("editor-image", t("common.image"));
  else if (!form.imageAlt?.trim()) add("editor-image-alt", t("editor.imageAlt"));
  if (!form.content?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim()) add("editor-content", t("editor.contentTitle"));
  if (!form.organizerName?.trim()) add("editor-organizer", t("common.organizer"));
  if (!form.occurrences.some(isCompleteOccurrence)) {
    const index = 0;
    const occurrence = form.occurrences[index];
    if (occurrence) {
      if (!occurrence.eventStartAt) add(`editor-occurrence-${index}-start`, t("common.start"), index);
      if (!occurrence.eventEndAt) add(`editor-occurrence-${index}-end`, t("common.end"), index);
      if (!occurrence.city?.trim()) {
        if (!occurrence.postalCode || !/^\d{5}$/.test(occurrence.postalCode.trim()) || cityOptions(index).length === 0) {
          add(`editor-occurrence-${index}-postal`, t("editor.postalCodeForCity"), index);
        } else {
          add(`editor-occurrence-${index}-city`, t("common.city"), index);
        }
      }
    }
  }
  form.occurrences.forEach((occurrence, index) => {
    if (occurrence.eventStartAt && occurrence.eventEndAt && occurrence.eventEndAt < occurrence.eventStartAt) {
      add(`editor-occurrence-${index}-end`, t("editor.invalidDateRange"), index);
    }
  });
  return issues;
});
const hasIssue = (id: string) => validationAttempted.value && validationIssues.value.some((issue) => issue.id === id);
const focusIssue = async (issue: ValidationIssue) => {
  if (issue.occurrenceIndex !== undefined && occurrencePanels.value[issue.occurrenceIndex]) {
    occurrencePanels.value[issue.occurrenceIndex].open = true;
  }
  await nextTick();
  const target = document.getElementById(issue.id);
  target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  if (target?.matches("input, select, textarea")) target.focus();
  else target?.querySelector<HTMLElement>("[contenteditable]")?.focus();
};

const validateBeforePublishing = async () => {
  editorError.value = null;
  validationAttempted.value = true;
  if (!validationIssues.value.length) return true;
  validationIssues.value.forEach((issue) => {
    if (issue.occurrenceIndex !== undefined && occurrencePanels.value[issue.occurrenceIndex]) {
      occurrencePanels.value[issue.occurrenceIndex].open = true;
    }
  });
  await focusIssue(validationIssues.value[0]);
  return false;
};

const geolocationStatusLabel = (index: number) => {
  switch (lastGeolocationPrecision.value[index]) {
    case "EXACT":
      return t("editor.geolocationExact");
    case "APPROXIMATE":
      return t("editor.geolocationApproximate");
    case "UNRESOLVED":
      return t("editor.geolocationUnresolved");
    default:
      return t("editor.geolocationPending");
  }
};

const geolocationStatusClass = (index: number) => {
  switch (lastGeolocationPrecision.value[index]) {
    case "EXACT":
      return "bg-emerald-50 text-emerald-700";
    case "APPROXIMATE":
      return "bg-amber-50 text-amber-700";
    case "UNRESOLVED":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const onManualLocationToggle = (index: number, event: Event) => {
  setManualLocation(index, (event.target as HTMLInputElement).checked);
};

const socialLinkTypes: SocialLinkType[] = ["FACEBOOK", "INSTAGRAM", "YOUTUBE", "LINKEDIN", "X", "TIKTOK"];

const socialLinkTypeOptions = computed(() =>
  socialLinkTypes.map((value) => ({
    value,
    label: t(`editor.socialLinkTypes.${value}`)
  }))
);

const getLocationQuery = (event: EventItem) => {
  if (!eventsStore.hasResolvedCoordinates(event)) {
    return { location: "unresolved", saved: "draft" };
  }

  if (eventsStore.hasApproximateGeolocation(event)) {
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

const hasTitle = computed(() => Boolean(editorForm.value.title?.trim()));

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
  editorForm.value.occurrences.forEach((occurrence) => {
    const postalCode = (occurrence.postalCode ?? "").trim();
    if (POSTAL_CODE_PATTERN.test(postalCode)) {
      communesStore.searchByPostalCode(postalCode);
    }
  });
});

const POSTAL_CODE_PATTERN = /^\d{5}$/;

const isPostalCodeComplete = (index: number) => POSTAL_CODE_PATTERN.test((editorForm.value.occurrences[index]?.postalCode ?? "").trim());

const cityOptions = (index: number) => {
  const occurrence = editorForm.value.occurrences[index];
  const postalCode = (occurrence?.postalCode ?? "").trim();
  const matches = communesStore.getResults(postalCode).map((commune) => commune.nomCommune);
  const currentCity = occurrence?.city?.trim();
  if (currentCity && !matches.includes(currentCity)) {
    return [currentCity, ...matches];
  }
  return matches;
};

const cityPlaceholder = (index: number) => (isPostalCodeComplete(index) ? t("editor.selectCity") : t("editor.enterPostalCodeFirst"));

const communesLoading = (index: number) => communesStore.isLoading(editorForm.value.occurrences[index]?.postalCode ?? "");

const communesError = (index: number) => communesStore.getError(editorForm.value.occurrences[index]?.postalCode ?? "");

const onPostalCodeInput = (index: number) => {
  const occurrence = editorForm.value.occurrences[index];
  if (!occurrence) {
    return;
  }

  occurrence.city = "";
  const postalCode = (occurrence.postalCode ?? "").trim();
  if (!POSTAL_CODE_PATTERN.test(postalCode)) {
    return;
  }

  communesStore.searchByPostalCode(postalCode).then((results) => {
    if (results.length === 1) {
      occurrence.city = results[0].nomCommune;
    }
  });
};

const goToEvents = () => {
  router.push("/backoffice/events");
};

const handleNewDraft = () => {
  resetEditorForm();
  contactsOpen.value = false;
  linksOpen.value = false;
  seoOpen.value = false;
  validationAttempted.value = false;
};

const imageInputRef = ref<HTMLInputElement | null>(null);
const pendingCropFile = ref<File | null>(null);

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  pendingCropFile.value = file;
};

const handleCropConfirm = (file: File) => {
  setImageFile(file);
  pendingCropFile.value = null;
  if (imageInputRef.value) {
    imageInputRef.value.value = "";
  }
};

const handleCropCancel = () => {
  pendingCropFile.value = null;
  if (imageInputRef.value) {
    imageInputRef.value.value = "";
  }
};

const handleSaveAndRedirect = async () => {
  const savedEvent = await saveDraftAndReturn();
  if (savedEvent) {
    validationAttempted.value = false;
    router.push({
      path: "/backoffice/events",
      query: getLocationQuery(savedEvent)
    });
  }
};

const handleSubmitAndRedirect = async () => {
  if (!await validateBeforePublishing()) return;
  const ok = await handleSaveAndSubmit();
  if (ok) {
    router.push("/backoffice/events");
  }
};

const handlePublishAndRedirect = async () => {
  if (!await validateBeforePublishing()) return;
  const ok = await handleSaveAndPublish();
  if (ok) {
    router.push("/backoffice/events");
  }
};

const isBuildingPreview = ref(false);

const handlePreview = async () => {
  if (isBuildingPreview.value) {
    return;
  }
  isBuildingPreview.value = true;
  try {
    const token = await savePreviewSnapshot();
    router.push({
      name: "backoffice-events-preview",
      query: { preview: token }
    });
  } finally {
    isBuildingPreview.value = false;
  }
};
</script>
