<template>
  <main class="min-h-screen bg-slate-50 text-slate-900">
    <header v-if="isHomeRoute" class="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Agenda culturel</p>
          <p class="text-lg font-semibold">Rene Website</p>
        </div>
        <button
          type="button"
          class="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
          @click="goToLogin"
        >
          Me connecter
        </button>
      </div>

    </header>

    <section v-if="isHomeRoute" class="mx-auto  px-6 py-16">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Agenda culturel</p>
      <h1 class="mt-4 text-4xl font-semibold">Rene Website</h1>
      <p class="mt-6 text-lg text-slate-600">
        Plateforme dédiée aux événements culturels autour de Descartes et des communes
        environnantes.
      </p>

      <div class="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label class="text-sm font-medium text-slate-700" for="home-search">
          Rechercher un événement
        </label>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="home-search"
            v-model="filters.search"
            data-testid="home-search"
            type="text"
            placeholder="Titre, lieu, ville ou type"
            class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
          />
          <button
            type="button"
            class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600"
            @click="resetFilters"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div class="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-xl font-semibold">Événements à venir</h2>
          <span class="text-sm text-slate-500">{{ filteredEvents.length }} résultats</span>
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-12">
          <aside class="space-y-6 lg:col-span-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Dates</p>
              <div class="mt-3 grid gap-3">
                <label class="text-sm text-slate-600">
                  Du
                  <input
                    v-model="filters.dateRange.start"
                    type="date"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    @input="handleDateRangeChange"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Au
                  <input
                    v-model="filters.dateRange.end"
                    type="date"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    @input="handleDateRangeChange"
                  />
                </label>
              </div>
              <label class="mt-4 block text-sm text-slate-600">
                Préselection
                <select
                  v-model="filters.preset"
                  class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  @change="applyPreset"
                >
                  <option value="">Personnalisé</option>
                  <option value="weekend">Ce week-end</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois-ci</option>
                </select>
              </label>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Villes</p>
              <div v-if="availableCities.length === 0" class="mt-3 text-sm text-slate-500">
                Aucune ville disponible.
              </div>
              <div v-else class="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
                <label
                  v-for="city in availableCities"
                  :key="city"
                  class="flex items-center gap-2 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    :checked="filters.cities.includes(city)"
                    :data-testid="`filter-city-${city}`"
                    @change="toggleCity(city)"
                  />
                  {{ city }}
                </label>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Types d'événements</p>
              <div v-if="availableTypes.length === 0" class="mt-3 text-sm text-slate-500">
                Aucun type disponible.
              </div>
              <div v-else class="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
                <label
                  v-for="type in availableTypes"
                  :key="type"
                  class="flex items-center gap-2 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    :checked="filters.types.includes(type)"
                    :data-testid="`filter-type-${type}`"
                    @change="toggleType(type)"
                  />
                  {{ type }}
                </label>
              </div>
            </div>
          </aside>

          <div class="lg:col-span-7">
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
            <ul v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="event-grid">
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

    <section v-else-if="isEventRoute" class="mx-auto max-w-5xl px-6 py-16">
      <button
        type="button"
        class="text-sm font-medium text-slate-600 hover:text-slate-900"
        @click="goToHome"
      >
        ← Retour à l'agenda
      </button>

      <div v-if="isLoading" class="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-slate-500">
        Chargement de l'événement…
      </div>
      <div v-else-if="!detailEvent" class="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-slate-500">
        Événement introuvable.
      </div>
      <div v-else class="mt-6 grid gap-8" data-testid="event-detail">
        <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <img
            class="h-80 w-full object-cover"
            :src="getEventImage(detailEvent)"
            :alt="detailEvent.title"
            @error="markImageError(detailEvent.id)"
          />
          <div class="p-8">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
              {{ formatDateTimeRange(detailEvent.eventStartAt, detailEvent.eventEndAt) }}
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-slate-900">{{ detailEvent.title }}</h2>
            <p class="mt-2 text-base text-slate-600">
              {{ detailEvent.venueName }} · {{ detailEvent.city }}
            </p>

            <p class="mt-6 whitespace-pre-line text-sm text-slate-600">
              {{ formatOptional(detailEvent.content) }}
            </p>

            <div class="mt-6 grid gap-2 text-sm text-slate-600">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Informations pratiques</p>
              <p><span class="font-medium text-slate-700">Organisateur:</span> {{ formatOptional(detailEvent.organizerName) }}</p>
              <p><span class="font-medium text-slate-700">Adresse:</span> {{ formatOptional(detailEvent.address) }}</p>
              <p><span class="font-medium text-slate-700">Code postal:</span> {{ formatOptional(detailEvent.postalCode) }}</p>
              <p><span class="font-medium text-slate-700">Email:</span> {{ formatOptional(detailEvent.contactEmail) }}</p>
              <p><span class="font-medium text-slate-700">Téléphone:</span> {{ formatOptional(detailEvent.contactPhone) }}</p>
              <p><span class="font-medium text-slate-700">Site organisateur:</span> {{ formatOptional(detailEvent.organizerUrl) }}</p>
              <p><span class="font-medium text-slate-700">Billetterie:</span> {{ formatOptional(detailEvent.ticketUrl) }}</p>
              <p><span class="font-medium text-slate-700">Site web:</span> {{ formatOptional(detailEvent.websiteUrl) }}</p>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <a
                class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                :href="buildDirectionsUrl(detailEvent)"
                target="_blank"
                rel="noopener noreferrer"
              >
                Itinéraire
              </a>
              <a
                class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                :href="buildCalendarUrl(detailEvent)"
                download="evenement.ics"
              >
                Ajouter au calendrier
              </a>
            </div>
          </div>
        </div>

        <EventMap :events="[detailEvent]" :selected-id="detailEvent.id" @select="openEventDetail" />
      </div>
    </section>

    <section v-else-if="isLoginRoute" class="mx-auto max-w-lg px-6 py-16">
      <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Espace professionnel</p>
        <h1 class="mt-3 text-3xl font-semibold text-slate-900">Connexion</h1>
        <p class="mt-2 text-sm text-slate-500">
          Accédez au backoffice pour publier et gérer les événements culturels.
        </p>

        <div class="mt-6 grid gap-4">
          <label class="text-sm text-slate-600">
            Email
            <input
              v-model="email"
              type="email"
              placeholder="prenom@exemple.fr"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label class="text-sm text-slate-600">
            Mot de passe
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label class="text-sm text-slate-600">
            Rôle
            <select v-model="role" class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="VISITOR">Visiteur</option>
              <option value="EDITOR">Rédacteur</option>
              <option value="MODERATOR">Modérateur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </label>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            @click="handleLogin"
          >
            Se connecter
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
            @click="goToHome"
          >
            Retour au site
          </button>
          <span v-if="canEdit" class="text-sm text-emerald-600">Accès rédaction/modération activé.</span>
        </div>
      </div>
    </section>

    <section v-else class="mx-auto max-w-6xl px-6 py-12">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Backoffice</p>
          <h1 class="mt-2 text-3xl font-semibold text-slate-900">Tableau de bord</h1>
          <p class="mt-1 text-sm text-slate-500">Rôle actif : {{ role }}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            v-if="isAuthenticated"
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
            @click="handleLogout"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <nav class="mt-6 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
        <button
          type="button"
          class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="goToHome"
        >
          Retour au site
        </button>
        <a
          v-if="canEdit"
          href="#backoffice-editor"
          class="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Mes événements
        </a>
        <a
          v-if="canModerate"
          href="#backoffice-moderation"
          class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
        >
          Modération
        </a>
        <a
          v-if="isAdmin"
          href="#backoffice-admin"
          class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
        >
          Administration
        </a>
      </nav>

      <div v-if="!isAuthenticated" class="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 class="text-xl font-medium text-slate-900">Connexion requise</h2>
        <p class="mt-2 text-sm text-slate-500">
          Connectez-vous pour accéder aux outils de rédaction, modération ou administration.
        </p>
        <button
          type="button"
          class="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          @click="goToLogin"
        >
          Se connecter
        </button>
      </div>

      <div v-else class="mt-8 grid gap-10">
        <div v-if="canEdit" id="backoffice-editor" class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-medium">Mes événements</h2>
            <span class="text-sm text-slate-500">Rôle requis: rédacteur, modérateur ou admin</span>
          </div>

          <div class="mt-6 grid gap-8">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6" data-testid="editor-form">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-slate-900">
                  {{ editorMode === "edit" ? "Modifier un événement" : "Créer un événement" }}
                </h3>
                <button
                  v-if="editorMode === 'edit'"
                  type="button"
                  class="text-sm text-slate-500 hover:text-slate-700"
                  @click="resetEditorForm"
                >
                  Nouveau brouillon
                </button>
              </div>

              <div v-if="editorError" class="mt-4 rounded-xl bg-rose-50 p-4 text-rose-700">
                {{ editorError }}
              </div>

              <div class="mt-6 grid gap-4 md:grid-cols-2">
                <label class="text-sm text-slate-600">
                  Titre
                  <input
                    v-model="editorForm.title"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Titre de l'événement"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Catégorie
                  <input
                    v-model="editorForm.categoryId"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="musique, lecture..."
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Image (URL)
                  <input
                    v-model="editorForm.image"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Organisateur
                  <input
                    v-model="editorForm.organizerName"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Nom de l'organisateur"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Début
                  <input
                    v-model="editorForm.eventStartAt"
                    type="datetime-local"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Fin
                  <input
                    v-model="editorForm.eventEndAt"
                    type="datetime-local"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Lieu
                  <input
                    v-model="editorForm.venueName"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Salle, médiathèque..."
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Adresse
                  <input
                    v-model="editorForm.address"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="12 rue..."
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Code postal
                  <input
                    v-model="editorForm.postalCode"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="37000"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Ville
                  <input
                    v-model="editorForm.city"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Descartes"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Email contact
                  <input
                    v-model="editorForm.contactEmail"
                    type="email"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="contact@exemple.fr"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Téléphone
                  <input
                    v-model="editorForm.contactPhone"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="06 00 00 00 00"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Billetterie
                  <input
                    v-model="editorForm.ticketUrl"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Site web
                  <input
                    v-model="editorForm.websiteUrl"
                    type="text"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Latitude
                  <input
                    v-model.number="editorForm.latitude"
                    type="number"
                    step="0.0001"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="46.97"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Longitude
                  <input
                    v-model.number="editorForm.longitude"
                    type="number"
                    step="0.0001"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="0.70"
                  />
                </label>
                <label class="text-sm text-slate-600 md:col-span-2">
                  Description
                  <textarea
                    v-model="editorForm.content"
                    class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows="4"
                    placeholder="Description de l'événement"
                  ></textarea>
                </label>
              </div>

              <div class="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                  @click="handleSaveDraft"
                >
                  {{ editorMode === "edit" ? "Mettre à jour" : "Enregistrer le brouillon" }}
                </button>
                <button
                  v-if="editorMode === 'edit'"
                  type="button"
                  class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  @click="handleSubmitDraft"
                >
                  Soumettre à modération
                </button>
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-slate-900">Brouillons & retours</h3>
              <p class="mt-1 text-sm text-slate-500">
                {{ editableEvents.length }} événements en cours
              </p>
              <div v-if="editableEvents.length === 0" class="mt-4 text-slate-500">
                Aucun brouillon ou retour à traiter.
              </div>
              <ul v-else class="mt-4 grid gap-4">
                <li
                  v-for="eventItem in editableEvents"
                  :key="eventItem.id"
                  class="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ eventItem.status }}</p>
                      <h4 class="mt-2 text-lg font-semibold text-slate-900">{{ eventItem.title }}</h4>
                      <p class="mt-1 text-sm text-slate-600">
                        {{ eventItem.venueName }} · {{ eventItem.city }}
                      </p>
                      <p v-if="eventItem.rejectionReason" class="mt-2 text-sm text-rose-600">
                        Motif: {{ eventItem.rejectionReason }}
                      </p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                        @click="startEdit(eventItem)"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        class="rounded-lg bg-emerald-500 px-3 py-2 text-sm text-white"
                        @click="handleSubmitDraft(eventItem.id)"
                      >
                        Soumettre
                      </button>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="canModerate" id="backoffice-moderation" class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-medium">Modération</h2>
            <span class="text-sm text-slate-500">Rôle requis: modérateur ou admin</span>
          </div>

          <div v-if="moderationError" class="mt-4 rounded-xl bg-rose-50 p-4 text-rose-700">
            {{ moderationError }}
          </div>

          <div v-if="pendingEvents.length === 0" class="mt-6 text-slate-500">
            Aucun événement en attente de modération.
          </div>
          <ul v-else class="mt-6 grid gap-4">
            <li
              v-for="eventItem in pendingEvents"
              :key="eventItem.id"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="text-sm uppercase tracking-[0.2em] text-slate-400">
                    {{ formatDate(eventItem.eventStartAt) }}
                  </p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">{{ eventItem.title }}</h3>
                  <p class="mt-1 text-sm text-slate-600">
                    {{ eventItem.venueName }} · {{ eventItem.city }}
                  </p>
                </div>
                <div class="flex flex-1 flex-col gap-3 md:max-w-md">
                  <input
                    v-model="rejectionReasons[eventItem.id]"
                    type="text"
                    placeholder="Motif de refus"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="rounded-lg bg-emerald-500 px-3 py-2 text-sm text-white"
                      @click="handlePublish(eventItem.id)"
                    >
                      Publier
                    </button>
                    <button
                      type="button"
                      class="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white"
                      @click="handleReject(eventItem.id)"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div v-if="isAdmin" id="backoffice-admin" class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-medium">Administration du site</h2>
            <span class="text-sm text-slate-500">Rôle requis: administrateur</span>
          </div>

          <div class="mt-6 grid gap-8">
            <div v-if="adminError" class="rounded-xl bg-rose-50 p-4 text-rose-700">
              {{ adminError }}
            </div>

            <div v-if="adminLoading" class="text-slate-500">Chargement de l'administration…</div>

            <div v-else class="grid gap-8">
              <div class="grid gap-8 lg:grid-cols-2">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6" data-testid="admin-user-form">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-slate-900">
                      {{ adminUserEditingId ? "Modifier un utilisateur" : "Créer un utilisateur" }}
                    </h3>
                    <button
                      v-if="adminUserEditingId"
                      type="button"
                      class="text-sm text-slate-500 hover:text-slate-700"
                      @click="resetAdminUserForm"
                    >
                      Nouveau
                    </button>
                  </div>

                  <div class="mt-4 grid gap-4">
                    <label class="text-sm text-slate-600">
                      Nom
                      <input
                        v-model="adminUserForm.name"
                        type="text"
                        class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Nom complet"
                      />
                    </label>
                    <label class="text-sm text-slate-600">
                      Email
                      <input
                        v-model="adminUserForm.email"
                        type="email"
                        class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="prenom@exemple.fr"
                      />
                    </label>
                    <label class="text-sm text-slate-600">
                      Rôle
                      <select
                        v-model="adminUserForm.role"
                        class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="EDITOR">Rédacteur</option>
                        <option value="MODERATOR">Modérateur</option>
                        <option value="ADMIN">Administrateur</option>
                      </select>
                    </label>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                      @click="handleSaveAdminUser"
                    >
                      {{ adminUserEditingId ? "Mettre à jour" : "Créer" }}
                    </button>
                  </div>
                </div>

                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6" data-testid="admin-category-form">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-slate-900">
                      {{ adminCategoryEditingId ? "Modifier une catégorie" : "Créer une catégorie" }}
                    </h3>
                    <button
                      v-if="adminCategoryEditingId"
                      type="button"
                      class="text-sm text-slate-500 hover:text-slate-700"
                      @click="resetAdminCategoryForm"
                    >
                      Nouveau
                    </button>
                  </div>

                  <div class="mt-4 grid gap-4">
                    <label class="text-sm text-slate-600">
                      Nom
                      <input
                        v-model="adminCategoryForm.name"
                        type="text"
                        class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Nom de la catégorie"
                      />
                    </label>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                      @click="handleSaveAdminCategory"
                    >
                      {{ adminCategoryEditingId ? "Mettre à jour" : "Créer" }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">Utilisateurs</h3>
                  <p class="mt-1 text-sm text-slate-500">{{ adminUsers.length }} utilisateurs</p>
                  <ul class="mt-4 grid gap-3" data-testid="admin-user-list">
                    <li
                      v-for="user in adminUsers"
                      :key="user.id"
                      class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p class="text-sm font-semibold text-slate-900">{{ user.name }}</p>
                          <p class="text-sm text-slate-500">{{ user.email }}</p>
                          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ user.role }}</p>
                        </div>
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                            @click="startAdminUserEdit(user)"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            class="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white"
                            @click="handleDeleteAdminUser(user.id)"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 class="text-lg font-semibold text-slate-900">Catégories</h3>
                  <p class="mt-1 text-sm text-slate-500">{{ adminCategories.length }} catégories</p>
                  <ul class="mt-4 grid gap-3" data-testid="admin-category-list">
                    <li
                      v-for="category in adminCategories"
                      :key="category.id"
                      class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-semibold text-slate-900">{{ category.name }}</p>
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                            @click="startAdminCategoryEdit(category)"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            class="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white"
                            @click="handleDeleteAdminCategory(category.id)"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6" data-testid="admin-settings-form">
                <h3 class="text-lg font-semibold text-slate-900">Réglages</h3>
                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <label class="text-sm text-slate-600">
                    Email de contact
                    <input
                      v-model="adminSettingsForm.contactEmail"
                      type="email"
                      class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="contact@rene-website.fr"
                    />
                  </label>
                  <label class="text-sm text-slate-600">
                    Téléphone
                    <input
                      v-model="adminSettingsForm.contactPhone"
                      type="text"
                      class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="01 02 03 04 05"
                    />
                  </label>
                  <label class="text-sm text-slate-600 md:col-span-2">
                    Intro page d'accueil
                    <textarea
                      v-model="adminSettingsForm.homepageIntro"
                      class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      rows="3"
                    ></textarea>
                  </label>
                </div>
                <div class="mt-4 flex gap-3">
                  <button
                    type="button"
                    class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                    @click="handleSaveAdminSettings"
                  >
                    Enregistrer les réglages
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CreateEventPayload, EventItem, fetchEvents, createEvent, submitEvent, updateEvent } from "./api/events";
import {
  AdminCategory,
  AdminSettings,
  AdminUser,
  createAdminCategory,
  createAdminUser,
  deleteAdminCategory,
  deleteAdminUser,
  fetchAdminCategories,
  fetchAdminSettings,
  fetchAdminUsers,
  updateAdminCategory,
  updateAdminSettings,
  updateAdminUser
} from "./api/admin";
import EventMap from "./components/EventMap.vue";
import placeholderEvent from "./assets/event-placeholder.svg";
import { EventFilters, filterEvents } from "./events/filterEvents";
import { publishEvent, rejectEvent, ModeratorRole } from "./api/moderation";
import { useAuth } from "./auth/useAuth";

const router = useRouter();
const route = useRoute();
const isHomeRoute = computed(() => route.path === "/");
const isLoginRoute = computed(() => route.path === "/login");
const isEventRoute = computed(() => route.path.startsWith("/event/"));

const goToLogin = () => {
  router.push("/login");
};

const goToHome = () => {
  router.push("/");
};

const goToBackoffice = () => {
  router.push("/backoffice");
};

const { role, email, password, isAuthenticated, login, logout, resetCredentials } = useAuth();

const events = ref<EventItem[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const moderationError = ref<string | null>(null);
const editorError = ref<string | null>(null);
const adminError = ref<string | null>(null);
const adminLoading = ref(false);
const imageErrorById = reactive<Record<string, boolean>>({});

const editorMode = ref<"create" | "edit">("create");
const editingEventId = ref<string | null>(null);
const rejectionReasons = reactive<Record<string, string>>({});

const adminUsers = ref<AdminUser[]>([]);
const adminCategories = ref<AdminCategory[]>([]);
const adminSettings = ref<AdminSettings | null>(null);

const adminUserEditingId = ref<string | null>(null);
const adminCategoryEditingId = ref<string | null>(null);
const adminUserForm = reactive({
  name: "",
  email: "",
  role: "EDITOR" as AdminUser["role"]
});
const adminCategoryForm = reactive({
  name: ""
});
const adminSettingsForm = reactive({
  contactEmail: "",
  contactPhone: "",
  homepageIntro: ""
});
const editorForm = reactive<CreateEventPayload>({
  title: "",
  content: "",
  image: "",
  categoryId: "",
  eventStartAt: "",
  eventEndAt: "",
  allDay: false,
  venueName: "",
  address: "",
  postalCode: "",
  city: "",
  latitude: 46.97,
  longitude: 0.7,
  organizerName: "",
  organizerUrl: "",
  contactEmail: "",
  contactPhone: "",
  ticketUrl: "",
  websiteUrl: ""
});

const filters = ref<EventFilters>({
  search: "",
  cities: [],
  types: [],
  preset: "",
  dateRange: {
    start: "",
    end: ""
  }
});

const publishedEvents = computed(() => events.value.filter((event) => event.status === "PUBLISHED"));
const pendingEvents = computed(() => events.value.filter((event) => event.status === "PENDING"));
const filteredEvents = computed(() =>
  filterEvents(publishedEvents.value, {
    search: filters.value.search,
    cities: filters.value.cities,
    types: filters.value.types,
    dateRange: filters.value.dateRange
  })
);
const detailEventId = computed(() => String(route.params.id));
const detailEvent = computed(() => events.value.find((event) => event.id === detailEventId.value) ?? null);
const editableEvents = computed(() =>
  events.value.filter((event) => event.status === "DRAFT" || event.status === "REJECTED")
);
const availableCities = computed(() =>
  Array.from(new Set(publishedEvents.value.map((event) => event.city))).sort()
);
const availableTypes = computed(() =>
  Array.from(new Set(publishedEvents.value.map((event) => event.categoryId))).sort()
);

const canModerate = computed(() => role.value === "MODERATOR" || role.value === "ADMIN");
const canEdit = computed(() => role.value === "EDITOR" || canModerate.value);
const isAdmin = computed(() => role.value === "ADMIN");

watch(
  [() => route.path, isAuthenticated],
  ([path, authenticated]) => {
    if (path === "/login" && authenticated) {
      router.replace("/backoffice");
      return;
    }
    if (path === "/backoffice" && !authenticated) {
      router.replace("/login");
    }
  },
  { immediate: true }
);

const handleLogin = () => {
  login(role.value);
  resetCredentials();
  goToBackoffice();
};

const handleLogout = () => {
  logout();
  goToLogin();
};

const updateEventState = (updated: EventItem) => {
  const exists = events.value.some((event) => event.id === updated.id);
  events.value = exists
    ? events.value.map((event) => (event.id === updated.id ? updated : event))
    : [updated, ...events.value];
};

const openEventDetail = (id: string) => {
  router.push(`/event/${id}`);
};

const markImageError = (id: string) => {
  imageErrorById[id] = true;
};

const getEventImage = (eventItem: EventItem) => {
  if (!eventItem.image || imageErrorById[eventItem.id]) {
    return placeholderEvent;
  }
  return eventItem.image;
};

const getEventExcerpt = (eventItem: EventItem) => eventItem.content ?? "";

const toggleCity = (city: string) => {
  const next = new Set(filters.value.cities);
  if (next.has(city)) {
    next.delete(city);
  } else {
    next.add(city);
  }
  filters.value.cities = Array.from(next);
};

const toggleType = (type: string) => {
  const next = new Set(filters.value.types);
  if (next.has(type)) {
    next.delete(type);
  } else {
    next.add(type);
  }
  filters.value.types = Array.from(next);
};

const handleDateRangeChange = () => {
  filters.value.preset = "";
};

const buildDirectionsUrl = (eventItem: EventItem) => {
  const destination = encodeURIComponent(`${eventItem.venueName}, ${eventItem.city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
};

const toIcsDate = (value: string) =>
  new Date(value).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

const buildCalendarUrl = (eventItem: EventItem) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//rene-website//agenda//FR",
    "BEGIN:VEVENT",
    `UID:${eventItem.id}@rene-website`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(eventItem.eventStartAt)}`,
    `DTEND:${toIcsDate(eventItem.eventEndAt)}`,
    `SUMMARY:${eventItem.title}`,
    `LOCATION:${eventItem.venueName} - ${eventItem.city}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
};

const handlePublish = async (id: string) => {
  moderationError.value = null;
  if (!canModerate.value) return;
  try {
    const updated = await publishEvent(id, role.value as ModeratorRole);
    updateEventState(updated);
  } catch (err) {
    moderationError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const handleReject = async (id: string) => {
  moderationError.value = null;
  if (!canModerate.value) return;
  const reason = rejectionReasons[id] ?? "";
  try {
    const updated = await rejectEvent(id, role.value as ModeratorRole, reason);
    updateEventState(updated);
    rejectionReasons[id] = "";
  } catch (err) {
    moderationError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const setRole = (value: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => {
  login(value);
};

const setRejectionReason = (id: string, value: string) => {
  rejectionReasons[id] = value;
};

const getModerationError = () => moderationError.value;

const resetEditorForm = () => {
  editorMode.value = "create";
  editingEventId.value = null;
  editorForm.title = "";
  editorForm.content = "";
  editorForm.image = "";
  editorForm.categoryId = "";
  editorForm.eventStartAt = "";
  editorForm.eventEndAt = "";
  editorForm.allDay = false;
  editorForm.venueName = "";
  editorForm.address = "";
  editorForm.postalCode = "";
  editorForm.city = "";
  editorForm.latitude = 46.97;
  editorForm.longitude = 0.7;
  editorForm.organizerName = "";
  editorForm.organizerUrl = "";
  editorForm.contactEmail = "";
  editorForm.contactPhone = "";
  editorForm.ticketUrl = "";
  editorForm.websiteUrl = "";
};

const startEdit = (eventItem: EventItem) => {
  editorMode.value = "edit";
  editingEventId.value = eventItem.id;
  editorForm.title = eventItem.title;
  editorForm.content = eventItem.content ?? "";
  editorForm.image = eventItem.image;
  editorForm.categoryId = eventItem.categoryId;
  editorForm.eventStartAt = formatDateTimeInput(eventItem.eventStartAt);
  editorForm.eventEndAt = formatDateTimeInput(eventItem.eventEndAt);
  editorForm.allDay = eventItem.allDay ?? false;
  editorForm.venueName = eventItem.venueName;
  editorForm.address = eventItem.address ?? "";
  editorForm.postalCode = eventItem.postalCode ?? "";
  editorForm.city = eventItem.city;
  editorForm.latitude = eventItem.latitude;
  editorForm.longitude = eventItem.longitude;
  editorForm.organizerName = eventItem.organizerName ?? "";
  editorForm.organizerUrl = eventItem.organizerUrl ?? "";
  editorForm.contactEmail = eventItem.contactEmail ?? "";
  editorForm.contactPhone = eventItem.contactPhone ?? "";
  editorForm.ticketUrl = eventItem.ticketUrl ?? "";
  editorForm.websiteUrl = eventItem.websiteUrl ?? "";
};

const buildEditorPayload = (): CreateEventPayload => ({
  ...editorForm,
  address: editorForm.address || undefined,
  organizerUrl: editorForm.organizerUrl || undefined,
  contactEmail: editorForm.contactEmail || undefined,
  contactPhone: editorForm.contactPhone || undefined,
  ticketUrl: editorForm.ticketUrl || undefined,
  websiteUrl: editorForm.websiteUrl || undefined
});

const handleSaveDraft = async () => {
  editorError.value = null;
  if (!canEdit.value) return;
  const payload = buildEditorPayload();
  try {
    const updated = editorMode.value === "edit" && editingEventId.value
      ? await updateEvent(editingEventId.value, payload, role.value)
      : await createEvent(payload, role.value);
    updateEventState(updated);
    if (editorMode.value === "create") {
      resetEditorForm();
    }
  } catch (err) {
    editorError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const handleSubmitDraft = async (id?: string) => {
  editorError.value = null;
  if (!canEdit.value) return;
  const targetId = id ?? editingEventId.value;
  if (!targetId) return;
  try {
    const updated = await submitEvent(targetId, role.value);
    updateEventState(updated);
    resetEditorForm();
  } catch (err) {
    editorError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const resetAdminUserForm = () => {
  adminUserEditingId.value = null;
  adminUserForm.name = "";
  adminUserForm.email = "";
  adminUserForm.role = "EDITOR";
};

const resetAdminCategoryForm = () => {
  adminCategoryEditingId.value = null;
  adminCategoryForm.name = "";
};

const startAdminUserEdit = (user: AdminUser) => {
  adminUserEditingId.value = user.id;
  adminUserForm.name = user.name;
  adminUserForm.email = user.email;
  adminUserForm.role = user.role;
};

const startAdminCategoryEdit = (category: AdminCategory) => {
  adminCategoryEditingId.value = category.id;
  adminCategoryForm.name = category.name;
};

const handleSaveAdminUser = async () => {
  adminError.value = null;
  if (!isAdmin.value) return;
  try {
    const payload = {
      name: adminUserForm.name,
      email: adminUserForm.email,
      role: adminUserForm.role
    };
    const updated = adminUserEditingId.value
      ? await updateAdminUser(role.value, adminUserEditingId.value, payload)
      : await createAdminUser(role.value, payload);
    adminUsers.value = [updated, ...adminUsers.value.filter((user) => user.id !== updated.id)];
    resetAdminUserForm();
  } catch (err) {
    adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const handleDeleteAdminUser = async (id: string) => {
  adminError.value = null;
  if (!isAdmin.value) return;
  try {
    await deleteAdminUser(role.value, id);
    adminUsers.value = adminUsers.value.filter((user) => user.id !== id);
    if (adminUserEditingId.value === id) {
      resetAdminUserForm();
    }
  } catch (err) {
    adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const handleSaveAdminCategory = async () => {
  adminError.value = null;
  if (!isAdmin.value) return;
  try {
    const payload = { name: adminCategoryForm.name };
    const updated = adminCategoryEditingId.value
      ? await updateAdminCategory(role.value, adminCategoryEditingId.value, payload)
      : await createAdminCategory(role.value, payload);
    adminCategories.value = [
      updated,
      ...adminCategories.value.filter((category) => category.id !== updated.id)
    ];
    resetAdminCategoryForm();
  } catch (err) {
    adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const handleDeleteAdminCategory = async (id: string) => {
  adminError.value = null;
  if (!isAdmin.value) return;
  try {
    await deleteAdminCategory(role.value, id);
    adminCategories.value = adminCategories.value.filter((category) => category.id !== id);
    if (adminCategoryEditingId.value === id) {
      resetAdminCategoryForm();
    }
  } catch (err) {
    adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const handleSaveAdminSettings = async () => {
  adminError.value = null;
  if (!isAdmin.value) return;
  try {
    const updated = await updateAdminSettings(role.value, { ...adminSettingsForm });
    adminSettings.value = updated;
  } catch (err) {
    adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
  }
};

const loadAdminData = async () => {
  adminError.value = null;
  adminLoading.value = true;
  try {
    const [users, categories, settings] = await Promise.all([
      fetchAdminUsers(role.value),
      fetchAdminCategories(role.value),
      fetchAdminSettings(role.value)
    ]);
    adminUsers.value = users;
    adminCategories.value = categories;
    adminSettings.value = settings;
    adminSettingsForm.contactEmail = settings.contactEmail;
    adminSettingsForm.contactPhone = settings.contactPhone;
    adminSettingsForm.homepageIntro = settings.homepageIntro;
  } catch (err) {
    adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
  } finally {
    adminLoading.value = false;
  }
};

defineExpose({
  handlePublish,
  handleReject,
  setRole,
  setRejectionReason,
  getModerationError,
  resetEditorForm,
  startEdit,
  handleSaveDraft,
  handleSubmitDraft,
  getEditorError: () => editorError.value,
  getEditorFormValues: () => ({ ...editorForm }),
  resetAdminUserForm,
  resetAdminCategoryForm,
  startAdminUserEdit,
  startAdminCategoryEdit,
  handleSaveAdminUser,
  handleSaveAdminCategory,
  handleDeleteAdminUser,
  handleDeleteAdminCategory,
  handleSaveAdminSettings,
  getAdminError: () => adminError.value
});

const pad = (value: number) => value.toString().padStart(2, "0");

const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getPresetRange = (preset: string, now: Date) => {
  if (preset === "weekend") {
    const day = now.getDay();
    const daysUntilSaturday = day === 6 ? 0 : (6 - day + 7) % 7;
    const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday);
    const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
    return { start: formatDateInput(saturday), end: formatDateInput(sunday) };
  }
  if (preset === "week") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { start: formatDateInput(start), end: formatDateInput(end) };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDateInput(start), end: formatDateInput(end) };
  }
  return { start: filters.value.dateRange.start, end: filters.value.dateRange.end };
};

const applyPreset = () => {
  const range = getPresetRange(filters.value.preset, new Date());
  filters.value.dateRange.start = range.start;
  filters.value.dateRange.end = range.end;
};

const resetFilters = () => {
  filters.value = {
    search: "",
    cities: [],
    types: [],
    preset: "",
    dateRange: {
      start: "",
      end: ""
    }
  };
};

const formatDate = (value: string) => new Date(value).toLocaleDateString("fr-FR");
const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${formatDate(start)} → ${formatDate(end)}`;
  }
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();
  if (sameDay) {
    return formatDate(start);
  }
  return `${formatDate(start)} → ${formatDate(end)}`;
};
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const formatDateTimeRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${formatDateTime(start)} → ${formatDateTime(end)}`;
  }
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();
  if (sameDay) {
    const dateLabel = startDate.toLocaleDateString("fr-FR", { dateStyle: "medium" });
    const startTime = startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const endTime = endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (startTime === endTime) {
      return `${dateLabel}, à ${startTime}`;
    }
    return `${dateLabel}, de ${startTime} à ${endTime}`;
  }
  return `${formatDateTime(start)} → ${formatDateTime(end)}`;
};
const formatOptional = (value?: string | null) => {
  if (!value || value.trim().length === 0) {
    return "Non renseigné";
  }
  return value;
};
const formatDateTimeInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

watch(
  () => role.value,
  (nextRole) => {
    if (nextRole === "ADMIN") {
      loadAdminData();
    }
  }
);

onMounted(async () => {
  try {
    events.value = await fetchEvents();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Erreur inconnue";
  } finally {
    isLoading.value = false;
  }
});
</script>
