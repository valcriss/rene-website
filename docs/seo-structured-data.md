# Données structurées Event et WebSite (#52)

## Ce qui est émis

- **Accueil** (`HomePage.vue`) : un objet `WebSite` (`useWebsiteStructuredData`).
- **Fiche événement** (`EventDetailPage.vue`) : un ou plusieurs objets `Event` — un par occurrence
  de l'événement publié (`useEventStructuredData`).

Les deux composables vivent dans `frontend/src/composables/useStructuredData.ts` et s'appuient sur
`useHead({ script: [...] })` (`@unhead/vue`), donc le JSON-LD est présent dans le HTML initial
rendu côté serveur (SSR, #46), pas seulement ajouté après hydratation côté client.

Aucun `Organization` distinct n'est émis : le site n'a pas d'entité éditrice modélisée séparément
de "R3ne" lui-même (pas de champ dédié dans `SiteSetting`), donc l'ajouter aurait signifié inventer
une donnée absente de la page.

## WebSite

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "R3ne",
  "url": "https://<SITE_URL>/"
}
```

## Event — un objet par occurrence

Conformément à la recommandation Google pour plusieurs représentations distinctes d'un même
événement (et pour plusieurs lieux simultanés) : plutôt que d'inventer une date ou une adresse
composite, chaque occurrence produit son propre objet `Event`, partageant l'URL canonique de la
fiche (`url`). Un événement à une seule occurrence émet un objet unique ; plusieurs occurrences
émettent un tableau JSON-LD.

Champs toujours présents : `@context`, `@type`, `name`, `url`, `eventStatus`
(`https://schema.org/EventScheduled` — l'application ne modélise ni annulation ni report, donc
cette valeur est toujours correcte), `eventAttendanceMode`
(`https://schema.org/OfflineEventAttendanceMode` — tous les événements sont des lieux physiques,
il n'existe pas de mode en ligne dans le modèle de données), et `location` (`Place` avec une
`PostalAddress`).

Champs conditionnels, **omis** plutôt qu'envoyés vides quand la donnée est absente ou non visible
sur la page :

| Champ | Condition |
|---|---|
| `startDate` / `endDate` | présents seulement si l'occurrence a une date renseignée |
| `location.name` | seulement si `venueName` est renseigné |
| `location.address.streetAddress` / `.postalCode` / `.addressLocality` | seulement si le champ correspondant est renseigné |
| `location.geo` | seulement si la géolocalisation est résolue (`hasResolvedCoordinates`) |
| `image` | seulement si l'événement a une vraie image téléversée — jamais le placeholder SVG générique affiché à sa place, qui n'est pas l'image de l'événement |
| `description` | seulement si le contenu produit un texte non vide une fois nettoyé |
| `organizer` | seulement si `organizerName` est renseigné ; `organizer.url` seulement si `organizerUrl` l'est aussi |
| `offers` | seulement si `ticketUrl` est renseigné (billetterie visible sur la page) |

### Gestion des dates et de `allDay`

Les occurrences "journée entière" sont normalisées côté backend en bornes UTC de la journée
(`00:00:00.000Z` → `23:59:59.999Z`, voir `backend/src/events/service.ts`
`normalizeOccurrenceDates`) — une convention de stockage, pas une heure réelle. Émettre ce
timestamp complet en `startDate`/`endDate` laisserait croire à un horaire précis qui n'existe pas
et n'est pas affiché sur la page. `toLdDate` tronque donc à la date seule (`YYYY-MM-DD`, format
recommandé par Google pour les événements sur toute la journée) quand `occurrence.allDay` est
vrai ; sinon la valeur ISO 8601 complète (avec le fuseau `Z`, déjà correcte) est utilisée telle
quelle.

Un événement dont toutes les occurrences sont passées reste un `Event` normal
(`eventStatus: EventScheduled`) : `eventStatus` sert à signaler une annulation ou un report, pas
le simple fait qu'une date soit dans le passé (voir aussi `docs/seo-http-status-policy.md` sur la
distinction entre "terminé naturellement" et "archivé").

## Tests

`frontend/tests/useStructuredData.test.ts` rend chaque composable via `renderToString` +
`transformHtmlTemplate` (même méthode que `usePageSeo.test.ts`) et parse le JSON-LD produit :
absence d'événement/occurrence, occurrence mono-date, occurrence `allDay`, géolocalisation
résolue ou non, événement multi-occurrences/multi-lieux, image/organisateur/billetterie présents
ou absents, adresse partiellement renseignée, événement dont l'occurrence est entièrement passée.

## Validation manuelle recommandée

Une fois déployé, valider une fiche événement représentative avec :

- [Rich Results Test](https://search.google.com/test/rich-results) (Google)
- [Schema Markup Validator](https://validator.schema.org/) (schema.org)

en collant l'URL publique `/evenements/<slug>` d'un événement publié. Aucune de ces vérifications
n'est automatisable en CI (services tiers) ; elles sont donc à faire ponctuellement après
déploiement, en particulier après tout changement de forme du JSON-LD.
