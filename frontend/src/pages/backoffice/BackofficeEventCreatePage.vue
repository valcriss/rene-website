<template>
  <section class="grid gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Formulaire éditorial</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-950">
          {{ editorMode === "edit" ? "Modifier un événement" : "Ajouter un événement" }}
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
        Retour à mes événements
      </button>
    </div>

    <div v-if="!canEdit" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour créer un événement.
      </p>
    </div>

    <div v-else class="grid gap-6" data-testid="editor-form">
      <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.95),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-3xl">
            <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">Mode courant</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">
              {{ editorMode === "edit" ? "Édition d’un événement existant" : "Création d’un nouveau brouillon" }}
            </h3>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              Le formulaire est découpé par usages pour éviter l’effet de long bloc uniforme. Renseignez les informations de programmation, de lieu et de contacts dans leur section dédiée.
            </p>
          </div>
          <button
            v-if="editorMode === 'edit'"
            type="button"
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900"
            @click="resetEditorForm"
          >
            Nouveau brouillon
          </button>
        </div>
      </div>

      <div v-if="editorError" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ editorError }}
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="grid gap-6">
          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Identité</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">L’essentiel de la fiche</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600 md:col-span-2">
                Titre
                <input
                  v-model="editorForm.title"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Titre de l'événement"
                />
              </label>
              <label class="text-sm text-slate-600">
                Catégorie
                <select
                  v-model="editorForm.categoryId"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  :disabled="categoriesLoading"
                >
                  <option value="">Sélectionner une catégorie</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
                <p v-if="categoriesLoading" class="mt-2 text-xs text-slate-500">
                  Chargement des catégories…
                </p>
                <p v-else-if="categories.length === 0" class="mt-2 text-xs text-slate-500">
                  Aucune catégorie disponible.
                </p>
              </label>
              <label class="text-sm text-slate-600">
                Image
                <input
                  type="file"
                  accept="image/*"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  @change="handleImageChange"
                />
                <p v-if="editorForm.image" class="mt-2 text-xs text-slate-500">
                  Image actuelle : {{ editorForm.image }}
                </p>
              </label>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Programmation</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">Date et horaire</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600">
                Début
                <input
                  v-model="editorForm.eventStartAt"
                  type="datetime-local"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </label>
              <label class="text-sm text-slate-600">
                Fin
                <input
                  v-model="editorForm.eventEndAt"
                  type="datetime-local"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </label>
              <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
                <input v-model="editorForm.allDay" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-slate-900" />
                Événement sur toute la journée
              </label>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Lieu</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">Adresse et localisation</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <label class="text-sm text-slate-600 md:col-span-2">
                Lieu
                <input
                  v-model="editorForm.venueName"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Salle, médiathèque..."
                />
              </label>
              <label class="text-sm text-slate-600 md:col-span-2">
                Adresse
                <input
                  v-model="editorForm.address"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="12 rue..."
                />
              </label>
              <label class="text-sm text-slate-600">
                Code postal
                <input
                  v-model="editorForm.postalCode"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="37000"
                />
              </label>
              <label class="text-sm text-slate-600">
                Ville
                <input
                  v-model="editorForm.city"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Descartes"
                />
              </label>
            </div>
          </section>
        </div>

        <div class="grid gap-6">
          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Organisateur</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">Contacts et structure</h3>
            <div class="mt-5 grid gap-4">
              <label class="text-sm text-slate-600">
                Organisateur
                <input
                  v-model="editorForm.organizerName"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Nom de l'organisateur"
                />
              </label>
              <label class="text-sm text-slate-600">
                Site organisateur
                <input
                  v-model="editorForm.organizerUrl"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="https://..."
                />
              </label>
              <label class="text-sm text-slate-600">
                Email contact
                <input
                  v-model="editorForm.contactEmail"
                  type="email"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="contact@exemple.fr"
                />
              </label>
              <label class="text-sm text-slate-600">
                Téléphone
                <input
                  v-model="editorForm.contactPhone"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="06 00 00 00 00"
                />
              </label>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Liens utiles</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">Billetterie et site public</h3>
            <div class="mt-5 grid gap-4">
              <label class="text-sm text-slate-600">
                Billetterie
                <input
                  v-model="editorForm.ticketUrl"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="https://..."
                />
              </label>
              <label class="text-sm text-slate-600">
                Site web
                <input
                  v-model="editorForm.websiteUrl"
                  type="text"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="https://..."
                />
              </label>
            </div>
          </section>

          <section class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Contenu éditorial</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-950">Description</h3>
            <div class="mt-5 text-sm text-slate-600">
              <RichTextEditor v-model="editorForm.content" />
            </div>
          </section>
        </div>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)]">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-sky-100/70">Actions de formulaire</p>
            <p class="mt-2 text-sm text-slate-300">
              Enregistrez un brouillon, ou soumettez la fiche quand elle est prête.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-50"
              @click="handleSaveAndRedirect"
            >
              {{ editorMode === "edit" ? "Mettre à jour" : "Enregistrer le brouillon" }}
            </button>
            <button
              v-if="editorMode === 'edit'"
              type="button"
              class="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-white/5"
              @click="handleSubmitAndRedirect"
            >
              Soumettre à modération
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
import { useRouter } from "vue-router";
import RichTextEditor from "../../components/form/RichTextEditor.vue";
import { useAuthStore } from "../../stores/auth";
import { useCategoriesStore } from "../../stores/categories";
import { useEditorStore } from "../../stores/editor";

const router = useRouter();
const authStore = useAuthStore();
const categoriesStore = useCategoriesStore();
const editorStore = useEditorStore();

const { canEdit } = storeToRefs(authStore);
const { categories, loading: categoriesLoading } = storeToRefs(categoriesStore);
const { editorMode, editorError, editorForm } = storeToRefs(editorStore);

const { resetEditorForm, handleSaveDraft, handleSubmitDraft, setImageFile } = editorStore;

const modeDescription = computed(() =>
  editorMode.value === "edit"
    ? "Mettez à jour une fiche existante, corrigez les retours éventuels puis renvoyez-la si besoin."
    : "Préparez un nouveau brouillon avec une structure plus claire entre contenu, lieu, programmation et contacts."
);

onMounted(() => {
  categoriesStore.loadCategories();
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
  const isEdit = editorMode.value === "edit";
  const ok = await handleSaveDraft();
  if (ok && isEdit) {
    router.push("/backoffice/events");
  }
};

const handleSubmitAndRedirect = async () => {
  const ok = await handleSubmitDraft();
  if (ok) {
    router.push("/backoffice/events");
  }
};
</script>
