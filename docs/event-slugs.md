# URLs stables et lisibles pour les événements (#50)

## Problème

Les fiches événement étaient exposées sous `/event/<uuid>` : une URL illisible, difficile à
partager oralement, et qui ne distingue pas un identifiant de base de données d'une adresse
publique pérenne.

## Solution

Chaque événement **publié** reçoit un `slug` unique, lisible, construit à partir du titre, de la
ville et de l'année de sa première occurrence datée (ex. `concert-jazz-descartes-2026`). L'URL
canonique publique devient `/evenements/<slug>`.

### Génération du slug

- Fonction pure : `backend/src/events/slug.ts` (`slugify`, `buildEventSlugBase`,
  `generateUniqueEventSlug`).
- `slugify` : décompose les accents (NFD), les supprime, met en minuscules, remplace toute
  séquence non alphanumérique par un tiret, puis retire les tirets en tête/fin.
- Le slug de base combine `titre[-ville][-année]` (ville/année omis si aucune occurrence datée
  n'est disponible), avec un repli sur `"evenement"` si le titre ne produit aucun caractère
  exploitable.
- Les collisions sont résolues de façon déterministe : `<base>`, puis `<base>-2`, `<base>-3`, …
  en interrogeant `EventRepository.findBySlug` à chaque tentative.

### Quand le slug est assigné

- **À la première publication** (`publishEvent`, transition vers `PUBLISHED`) — jamais recalculé
  ensuite. Une simple correction de titre après publication (édition d'un événement déjà publié,
  publication d'une révision) ne touche pas au slug : c'est le contrat explicite de l'issue.
- **Changement explicite** : `PATCH /api/events/:id/slug` (rôle `ADMIN` uniquement), body
  `{ "slug": "nouveau-slug" }`. L'événement doit être publié ; le slug doit respecter le format
  `^[a-z0-9]+(-[a-z0-9]+)*$` et ne pas être déjà utilisé par un autre événement.

### Historique et redirections

- Table `EventSlugRedirect` (`eventId`, `slug` unique, `createdAt`) : à chaque changement de slug
  (`EventRepository.setSlug`), l'ancien slug est archivé dans cette table avant d'écrire le
  nouveau sur `Event.slug`. Les changements successifs restent résolubles : `resolveSlugRedirect`
  suit l'historique jusqu'au slug **actuel** de l'événement, quel que soit le nombre de
  changements intermédiaires.
- Routage SSR (`backend/src/static.ts`) :
  - `/evenements/:slug` connu et publié → rendu SSR avec le bon statut (200, ou 410 si
    l'événement a été archivé).
  - `/evenements/:slug` inconnu mais présent dans l'historique → redirection **301** vers
    `/evenements/<slug-actuel>`.
  - `/evenements/:slug` inconnu et absent de l'historique → 404.
  - `/event/:id` (ancienne URL) avec un événement qui possède un slug → redirection **301** vers
    `/evenements/<slug>`, quel que soit son statut actuel (un événement archivé redirige aussi,
    la page cible répond alors elle-même 410).
  - `/event/:id` sans slug (jamais publié, ou introuvable) → comportement inchangé (rendu SSR
    avec le statut 404 déterminé par `getPublicEventPageStatus`, cf. `docs/seo-http-status-policy.md`).

### Frontend

- Route unique `/evenements/:slug` (`frontend/src/router.ts`), remplace `/event/:id`.
- `useEventsStore().getEventBySlug(slug)` résout l'événement à partir de la liste publique déjà
  chargée (même mécanisme que `getEventById`, pas de nouvel appel réseau).
- `frontend/src/utils/eventLinks.ts` (`getEventDetailPath`) centralise la construction du lien :
  `/evenements/<slug>` quand le slug est connu, repli sur `/event/<id>` sinon (le backend redirige
  cette URL vers la bonne destination — utile juste après une publication, avant que le client
  n'ait rechargé la liste des événements avec le slug fraîchement assigné).
- Tous les liens internes (cartes de la page d'accueil, carrousel, événements associés, sélection
  sur la carte) utilisent ce helper ; plus aucune construction de `/event/${id}` en dur dans les
  composants.
- Le canonical/Open Graph (`usePageSeo`) n'a pas eu besoin de changement : il reprend déjà
  `route.path`, qui reflète la véritable URL visitée.

## Migration PostgreSQL

- `backend/prisma/migrations/20260924180000_add_event_slug/migration.sql` :
  - `Event.slug` (`TEXT`, nullable, index unique — plusieurs `NULL` sont autorisés par Postgres).
  - Table `EventSlugRedirect` (clé étrangère `ON DELETE CASCADE` vers `Event`).
- **Rollback manuel** (Prisma ne génère pas de migration "down") :

  ```sql
  ALTER TABLE "EventSlugRedirect" DROP CONSTRAINT "EventSlugRedirect_eventId_fkey";
  DROP TABLE "EventSlugRedirect";
  DROP INDEX "Event_slug_key";
  ALTER TABLE "Event" DROP COLUMN "slug";
  ```

  Documenté ici plutôt que livré comme fichier de migration : Prisma applique les migrations dans
  l'ordre et ne propose pas de retour arrière automatique, ce script est à exécuter manuellement
  en cas de besoin, puis à retirer l'entrée correspondante de `_prisma_migrations`.

### Backfill des événements déjà publiés

La migration ne peuple pas rétroactivement le slug des événements publiés **avant** son
déploiement (`publishEvent` ne s'exécute qu'à la publication, pas à la migration). Exécuter une
fois, après la migration :

```bash
npm run prisma:backfill-event-slugs -w backend
```

(`backend/prisma/backfillEventSlugs.ts`, réutilise `generateUniqueEventSlug` — même logique et
même résolution de collision que la publication normale). Le script est idempotent : les
événements qui ont déjà un slug sont ignorés, il peut donc être relancé sans risque.

## Tests

- `backend/tests/events.slug.test.ts` : `slugify` (accents, apostrophes, ponctuation),
  `buildEventSlugBase` (avec/sans ville, occurrence non datée ignorée, plusieurs occurrences —
  la plus proche l'emporte, replis), `generateUniqueEventSlug` (aucune collision, une collision,
  collisions en chaîne).
- `backend/tests/events.inMemoryRepository.test.ts`, `events.prismaRepository.test.ts` :
  `findBySlug`, `resolveSlugRedirect`, `setSlug` (y compris l'archivage de l'ancien slug).
- `backend/tests/events.service.test.ts` : assignation à la première publication, absence de
  changement lors de la republication d'une révision, `updateEventSlug` (rôle, format, collision,
  événement non publié).
- `backend/tests/events.routes.test.ts` : `PATCH /api/events/:id/slug` de bout en bout (assignation
  automatique à la publication, changement explicite, erreurs 400/403/404).
- `backend/tests/static.test.ts` : les quatre statuts du routage SSR (200/410 sur le slug
  canonique, 301 sur l'ancien id, 301 sur un ancien slug, 404 réel).
- Frontend : `frontend/tests/router.test.ts`, `homePage.test.ts`, `relatedEvents.test.ts`,
  `eventDetailPage.test.ts`, `app.test.ts`, `entryServer.test.ts` couvrent la résolution par slug,
  la navigation interne et le rendu SSR sur `/evenements/:slug`.
