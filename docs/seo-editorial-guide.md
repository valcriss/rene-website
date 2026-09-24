# Encadrer les contenus SEO dans l'éditeur d'événements (#55)

## Problème

Le modèle d'événement n'avait ni texte alternatif pour l'affiche, ni règles éditoriales SEO. La
description sociale/moteurs de recherche était entièrement déduite du HTML riche (issue #47), et
l'image pouvait être absente ou peu descriptive pour les lecteurs d'écran comme pour les moteurs.

## Nouveaux champs

Trois champs optionnels ajoutés à `Event` et `EventRevision` (migration
`20260924190000_add_event_seo_fields`) :

| Champ                     | Type            | Rôle                                                             |
|---------------------------|-----------------|-------------------------------------------------------------------|
| `imageAlt`                | `string \| null` | Texte alternatif de l'affiche.                                    |
| `seoTitleOverride`        | `string \| null` | Titre affiché dans les résultats de recherche/partages, si renseigné. |
| `seoDescriptionOverride`  | `string \| null` | Description affichée dans les résultats de recherche/partages, si renseignée. |

Les trois sont **optionnels à l'enregistrement d'un brouillon**, comme `image` lui-même. En
revanche, `backend/src/events/validation.ts` (`validateEventCompleteness`, appelée à la
**soumission** d'un événement pour modération) exige un `imageAlt` non vide dès qu'une `image` est
renseignée — cohérent avec le fait que `image` y est déjà obligatoire pour tout événement soumis.
Limites de longueur (`validateCreateEvent`) : 200 caractères pour `imageAlt`, 70 pour
`seoTitleOverride`, 160 pour `seoDescriptionOverride` (bornes usuelles des balises `<title>`/
`meta description`).

### Valeurs par défaut pour les événements existants

`backend/prisma/backfillEventImageAlt.ts` (à lancer une fois après déploiement de la migration,
`npx ts-node prisma/backfillEventImageAlt.ts`) remplit `imageAlt` avec le titre de l'événement pour
toute ligne `Event`/`EventRevision` ayant une image mais pas encore de texte alternatif — un
événement déjà publié ou en cours de modération avant cette migration ne se retrouve jamais bloqué
par la nouvelle règle de complétude. Idempotent, sans risque à relancer.

## Titre et description : calcul par défaut, override optionnel

`frontend/src/utils/seo.ts` expose deux fonctions pures, partagées entre l'aperçu de l'éditeur et
la fiche publique réelle (`EventDetailPage.vue`, `usePageSeo`) — garantissant que l'aperçu affiché
pendant l'édition est *exactement* ce qui sera rendu publiquement :

- `computeSeoTitle(event, siteName)` → `event.seoTitleOverride` s'il est renseigné (non vide après
  `trim()`), sinon `${event.title} — ${siteName}` (le même calcul qu'avant cette issue).
- `computeSeoDescription(event)` → `event.seoDescriptionOverride` s'il est renseigné, sinon
  `buildPlainTextDescription(event.content)` (déjà utilisé depuis l'issue #47).

Un override vide ou composé uniquement d'espaces compte comme « pas d'override » et retombe
proprement sur la valeur calculée — aucun état intermédiaire invalide n'est possible.

## Éditeur : aperçu, overrides et alertes

`frontend/src/pages/backoffice/BackofficeEventCreatePage.vue` ajoute une section « Référencement »
après les liens utiles, avec :

- Un champ `imageAlt` juste sous le champ image, avec une aide de saisie expliquant son rôle
  (lecteurs d'écran + moteurs de recherche).
- Deux champs d'override (titre, description), chacun avec un compteur de caractères textuel
  (`12/70 caractères`) — jamais une indication de couleur seule, conformément aux critères
  d'accessibilité de l'issue.
- `frontend/src/components/form/SeoPreviewCard.vue` : composant autonome qui recalcule en direct
  (à partir des mêmes fonctions `computeSeoTitle`/`computeSeoDescription`) un aperçu de résultat de
  recherche et un aperçu de partage social, ainsi que la liste d'alertes ci-dessous. Entièrement
  piloté par props, donc testable indépendamment de l'éditeur complet.

### Alertes non bloquantes

`frontend/src/utils/seoAlerts.ts` (`computeSeoAlerts`) calcule, à partir du titre, de la
description effective, de l'image et des occurrences en cours d'édition, une liste d'alertes
purement informatives — **aucune n'empêche l'enregistrement d'un brouillon ni la soumission** :

- `genericTitle` — titre de moins de 10 caractères.
- `thinDescription` — description effective de moins de 50 caractères.
- `missingImage` — aucune image renseignée.
- `incoherentDates` — une occurrence dont la date de fin précède sa date de début.
- `missingLocation` — aucune occurrence ne renseigne de ville.

Chaque alerte s'affiche comme une puce icône + texte (jamais une couleur seule) sous l'aperçu, avec
un libellé traduit FR/EN.

## Fiche publique

- `EventDetailPage.vue` utilise désormais `computeSeoTitle`/`computeSeoDescription` (au lieu du
  calcul en dur précédent) pour les balises `<title>`, `meta description`, Open Graph et X Card, et
  transmet `imageAlt` à `usePageSeo` pour `og:image:alt`.
- `EventDetailView.vue`, `HomePage.vue` (carrousel et grille) et `RelatedEvents.vue` utilisent
  `event.imageAlt || event.title` comme attribut `alt` de l'affiche — un texte alternatif
  descriptif quand il existe, sans jamais laisser un `alt` vide.

## Tests

- Backend : `events.validation.test.ts` (règle de complétude conditionnelle, limites de longueur,
  normalisation), suite `events.service.test.ts`/`events.routes.test.ts` mises à jour pour la
  nouvelle exigence — 792 tests, 100 % de couverture maintenue.
- Frontend : `seo.test.ts` (`computeSeoTitle`/`computeSeoDescription`), `seoAlerts.test.ts` (les 5
  règles d'alerte), `seoPreviewCard.test.ts` (aperçu par défaut, overrides, image de repli,
  alertes), mises à jour de `editorHandlers.test.ts` (chargement des champs en édition),
  `backofficeEventCreatePage.test.ts` (liaison des champs, compteurs, aperçu en direct),
  `eventDetailView.test.ts`/`homePage.test.ts`/`relatedEvents.test.ts` (repli du texte alternatif)
  — 529 tests, couverture globale ~95 % (seuil à 80 %).

## Hors périmètre

- Pas de mécanisme de suggestion automatique de texte alternatif (reconnaissance d'image) —
  au-delà du périmètre de cette issue.
- Les alertes sont calculées côté client uniquement, à l'usage de l'éditeur ; elles ne sont ni
  stockées ni exposées par l'API.
