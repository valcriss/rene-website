# Pages SEO locales et thématiques (#56)

## Problème

Les filtres ville, catégorie et « Ce week-end » de la page d'accueil n'existaient qu'en état
client (Pinia) : aucune URL partageable, rien d'indexable, alors que les recherches locales
(« concert Descartes », « sorties ce week-end ») correspondent au cœur du produit.

## Inventaire des pages créées

Trois types de pages, toutes rendues côté serveur (même pipeline SSR que le reste du site) :

| Type | URL | Évergreen ? |
|---|---|---|
| Week-end | `/agenda/ce-week-end` | Oui — toujours listée, jamais retirée du sitemap |
| Ville | `/agenda/ville/<slug>` | Non — dépend des événements actuellement publiés |
| Catégorie | `/agenda/categorie/<slug>` | Non — dépend des événements actuellement publiés |

**Aucune autre combinaison n'est créée.** Pas de `/agenda/ville/x/categorie/y`, pas de routes
paramétrées par la recherche libre ou une plage de dates arbitraire. C'est la règle
anti-explosion combinatoire : les seules pages qui existent sont celles listées ci-dessus, un
nombre borné par le nombre de villes et de catégories réellement utilisées — jamais par leur
produit cartésien. La page d'accueil (`/`) garde ses filtres 100 % côté client, sans jamais les
refléter dans l'URL (déjà vrai avant cette issue) : il ne peut donc pas exister de doublon
indexable du type `/?ville=...&categorie=...`.

## Known vs. active : la distinction qui pilote 404 / contenu vide / sitemap

Pour ville et catégorie, deux notions distinctes (`backend/src/seo/agenda.ts`,
`frontend/src/utils/agendaFacets.ts` — logique dupliquée intentionnellement des deux côtés,
identique champ à champ) :

- **Known** (connue) : le slug/id a été utilisé par **au moins un événement, quel que soit son
  statut** (brouillon, en attente, publié, archivé...). Détermine si l'URL existe (200) ou non
  (404).
- **Active** : le slug/id est utilisé par **au moins un événement actuellement publié et non
  archivé** — la même règle de visibilité publique que l'API et le sitemap appliquent déjà
  ailleurs. Détermine si la page a du contenu à montrer et si elle doit être indexée.

|                        | Known | Active | Statut HTTP | Contenu | Sitemap | `X-Robots-Tag` |
|---|---|---|---|---|---|---|
| Jamais utilisée        | Non   | Non    | 404         | —                     | Absente | — |
| Événements actuels      | Oui   | Oui    | 200         | Liste d'événements     | Présente | Aucun (indexable) |
| Plus aucun événement actif (mais en a eu) | Oui | Non | 200 | État vide + lien vers l'agenda complet | Absente | `noindex` |

Ce choix évite qu'une page bascule en 404 le jour même où son dernier événement est archivé
(mauvaise expérience pour un lien déjà partagé/indexé), tout en évitant d'indexer une page
durablement vide (contenu mince). « Durablement » est ici implicite : le sitemap est recalculé à
chaque requête à partir de l'état live, donc une ville qui redevient active réapparaît
automatiquement, sans logique d'historique à maintenir.

La page week-end n'a pas cette distinction : elle est évergreen, toujours 200, toujours dans le
sitemap, jamais `noindex`, même si elle ne liste actuellement aucun événement (cas limite qui ne
devrait jamais se produire sur un site actif, et qui se corrigera de lui-même la semaine
suivante).

Catégorie : l'identifiant de catégorie (`categoryId`, ex. `music`, `theatre`) sert directement de
slug — aucune génération de slug séparée n'est nécessaire, contrairement à la ville qui est du
texte libre (`slugify`, réutilisé de `backend/src/events/slug.ts` / dupliqué dans
`frontend/src/utils/slugify.ts` avec le même algorithme, pour que les slugs générés côté serveur
se résolvent correctement côté client).

## Rendu

- `backend/src/static.ts` : `/agenda/ce-week-end` est une route statique connue (comme `/` ou
  `/contact`) ; `/agenda/ville/:slug` et `/agenda/categorie/:slug` sont résolues dynamiquement via
  `getAgendaCityPageStatus`/`getAgendaCategoryPageStatus`, qui déterminent le statut HTTP et si
  `X-Robots-Tag: noindex` doit être ajouté avant de lancer le rendu SSR (ou de renvoyer un vrai 404
  sans jamais invoquer le renderer pour un slug totalement inconnu).
- `frontend/src/pages/AgendaLandingPage.vue` : un seul composant pour les trois types de page
  (déterminé via `route.name`), qui calcule un H1, une introduction et une balise `<title>`/
  meta description uniques par page (`usePageSeo`), affiche la liste d'événements correspondants
  (mêmes cartes cliquables — vrais liens `<RouterLink>`, cf. issue #49) ou un état vide explicite
  avec un lien de retour vers l'agenda complet. Le filtrage réutilise `filterEvents` (déjà utilisé
  par la page d'accueil) et respecte la même règle « à partir d'aujourd'hui » que le filtre par
  défaut de l'accueil, pour ne jamais lister un événement déjà terminé.
- Le composant ne cherche jamais à distinguer *known* de *unknown* lui-même : côté client, un
  visiteur anonyme ne reçoit de toute façon que les événements publics, donc cette distinction n'a
  de sens que côté serveur (pour le code HTTP). Si le slug ne correspond à aucun événement public
  actuel, la page affiche simplement l'état vide — cohérent avec ce que `static.ts` a déjà décidé
  du côté HTTP.

## Maillage

- `frontend/src/pages/HomePage.vue` ajoute une section « Explorer l'agenda » listant un lien vers
  `/agenda/ce-week-end` et vers chaque ville/catégorie actuellement active (mêmes fonctions
  `getActiveCityFacets`/`getActiveCategoryIds` que le sitemap) — un crawler qui visite la page
  d'accueil découvre donc ces pages par un lien classique, pas seulement via `sitemap.xml`.

## Sitemap

`backend/src/seo/sitemap.ts` ajoute :
- `/agenda/ce-week-end` inconditionnellement (liste `STATIC_PUBLIC_PATHS`) ;
- une entrée `/agenda/ville/<slug>` par ville active ;
- une entrée `/agenda/categorie/<categoryId>` par catégorie active.

## Tests

- Backend : `seo.agenda.test.ts` (known/actif pour ville et catégorie, dédoublonnage
  accent/casse/espaces, exclusion des événements archivés), extension de `static.test.ts` (200
  indexable / 200 `noindex` / 404 pour chaque type de page) et `seo.sitemap.test.ts` (présence de
  la page week-end, présence/absence des pages ville/catégorie selon leur activité) — 816 tests,
  100 % de couverture.
- Frontend : `slugify.test.ts`, `dateRangePresets.test.ts`, `agendaFacets.test.ts`,
  `agendaLandingPage.test.ts` (les trois types de page, repli sur un nom humanisé pour une ville
  inconnue, exclusion par ville/catégorie/date, lien de retour depuis l'état vide), mises à jour de
  `homePage.test.ts` (maillage) et `router.test.ts` — 552 tests, couverture globale ~95 % (seuil à
  80 %).
- Vérification manuelle : `npm run build` (client + SSR + backend) et
  `npm run check:bundle-size -w frontend` (nouveau budget `AgendaLandingPage-` à 4 KB gzip pour un
  poids mesuré de 1,8 KB) exécutés avec succès.

## Hors périmètre

- Pas de pagination sur les pages d'agenda : le volume d'événements d'un site culturel local ne le
  justifie pas aujourd'hui ; à réévaluer si une ville/catégorie dépasse un nombre d'événements
  simultanés rendant la page trop longue.
- Pas de combinaison ville+catégorie ni d'autres facettes éditoriales : l'issue demande
  explicitement de rester sur un ensemble limité, justifié éditorialement, jamais sur toutes les
  facettes possibles.
