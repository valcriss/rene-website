# Politique de statuts HTTP et d’indexation

Le fallback SPA (`backend/src/static.ts`) ne renvoie plus systématiquement `200 OK`. Il
inspecte le chemin demandé et choisit un statut cohérent avec le contenu réellement servi,
pour éliminer les « soft 404 » (page d’erreur affichée côté client derrière un statut 200).

## Statuts par type de route

| Type de route | Exemple | Statut | Remarque |
| --- | --- | --- | --- |
| Route API non trouvée | `GET /api/foo` | `404` (JSON) | Ne sert jamais le shell SPA ; réponse `{ "message": "Route API introuvable." }`. |
| Fiche événement publiée, non archivée | `/event/:id` | `200` | Y compris lorsque l’événement est terminé (voir ci-dessous). |
| Fiche événement inconnue ou jamais publiée | `/event/:id` | `404` | Brouillon, en attente, refusé ou identifiant inexistant. |
| Fiche événement archivée volontairement | `/event/:id` | `410` | Retrait durable et intentionnel (`archivedAt` renseigné). |
| Route applicative connue | `/`, `/contact`, `/mentions-legales` | `200` | Liste statique alignée sur `frontend/src/router.ts`. |
| Backoffice et authentification | `/backoffice/*`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | `200` + `X-Robots-Tag: noindex` | Contenu servi normalement mais explicitement exclu de l’indexation. |
| Route applicative inconnue | `/nimporte-quoi` | `404` | Vraie page 404 ; le shell SPA est servi avec le statut 404 et le routeur Vue affiche `NotFoundPage`. |

La logique de décision pour une fiche événement vit dans `getPublicEventPageStatus`
(`backend/src/events/service.ts`), réutilisée telle quelle par `static.ts` pour garantir que
l’API publique et le rendu HTML appliquent la même règle.

## Cycle de vie d’un événement

- **Terminé mais utile** : quand `publicationEndAt` est dépassé sans que l’événement soit
  archivé, la fiche reste `200`, indexable, affiche un bandeau « événement terminé » et
  continue de proposer les prochains événements liés (`RelatedEvents`, qui n’inclut que des
  événements encore à venir). C’est une décision produit assumée : l’historique d’un
  événement passé a une valeur SEO et de navigation.
- **Archivé** : `archivedAt` marque un retrait volontaire et durable. La fiche devient `410`
  côté HTTP et sort des listes publiques (`listPublicEvents`, `getPublicEvent`).
- **Jamais publié / supprimé** : un identifiant sans événement `PUBLISHED` correspondant
  renvoie `404`, qu’il s’agisse d’un brouillon, d’un événement en attente/refusé ou d’un
  identifiant qui n’a jamais existé — ces cas sont indiscernables une fois l’enregistrement
  absent, et la distinction n’a pas de valeur pour un visiteur anonyme.

## Redirections 301 (hors périmètre de cette issue)

La politique attendue prévoit un `301` vers l’URL canonique quand un événement est déplacé.
Le modèle de données actuel ne porte aucune notion de « slug stable » ou d’ancien
identifiant : un événement déplacé n’est pas distinguable d’un nouvel événement. Introduire
un mécanisme de redirection maintenant reviendrait à inventer une fonctionnalité non
demandée (voir la règle anti-scope-creep de `CLAUDE.md`). Cette redirection sera mise en
place avec l’introduction des slugs stables et des URL canoniques (issue #50), qui fournira
la donnée nécessaire (ancien slug → nouveau slug) pour émettre un `301` fiable.

## Page 404 applicative

`frontend/src/router.ts` ajoute une route catch-all (`/:pathMatch(.*)*`) qui rend
`NotFoundPage.vue`. Cette page conserve l’en-tête de navigation du site et propose un lien
de retour vers l’agenda (`/`), conformément au critère d’acceptation de l’issue.

## robots.txt et sitemap

La génération de `/robots.txt` et `/sitemap.xml`, ainsi que les règles `noindex` associées
au sitemap, sont traitées par l’issue #51 et ne sont pas dupliquées ici.
