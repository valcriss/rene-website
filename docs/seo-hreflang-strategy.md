# Stratégie SEO multilingue et hreflang (#57)

## Problème

L'interface bascule FR/EN sur une seule et même URL (`frontend/src/i18n/index.ts`,
`frontend/src/components/navigation/Header.vue`) : seul le texte d'interface (boutons, libellés,
titres de section) est traduit — le contenu principal d'un événement (titre, description,
lieux) reste toujours dans la langue où l'éditeur l'a saisi, en pratique le français. `<html
lang="fr">` était par ailleurs recalculé à l'initialisation depuis `navigator.language` du
visiteur quand aucun choix n'avait été sauvegardé, ce qui veut dire qu'une même URL pouvait
« rendre » différemment (chrome anglais autour d'un contenu français) selon la locale du
navigateur qui la visite — y compris celle d'un robot d'indexation, sans qu'aucun choix
explicite n'ait été fait.

## Décision : option 1 — site indexé en français uniquement

Deux options étaient possibles (voir l'issue) : de vraies URLs localisées (`/fr/...`,
`/en/...`) avec contenu traduit et `hreflang` réciproque, ou un site indexé en français
uniquement avec l'anglais traité comme préférence d'interface non indexable.

**Option 1 retenue.** Le contenu métier (les événements) n'est pas traduit et rien ne le prévoit
à court terme — le construire (traduction éditoriale, champs localisés dans le modèle
`Event`/`EventRevision`, URLs par langue, sitemap par langue) serait une fonctionnalité V2
disproportionnée pour ce que l'issue demande de trancher. Publier des URLs `/en/...` dont
*seul le chrome* serait traduit autour d'un événement français identique est explicitement ce
que l'issue interdit ("Ne pas publier des pages anglaises dont seul le chrome est traduit
autour d'un événement français identique") : ce serait donc une régression, pas une
amélioration.

Le sélecteur de langue FR/EN de l'en-tête reste une préférence d'interface locale (comme un
widget de traduction), jamais une URL distincte, jamais indexée séparément — il n'y a donc
structurellement aucune paire de pages équivalentes à relier par `hreflang`.

## Correctif : rendu déterministe pour les robots

Le vrai problème à corriger n'était pas l'absence de `hreflang` (il n'y a rien à relier), mais
le fait que le rendu de la seule URL existante n'était **pas déterministe** : sans choix
explicite sauvegardé, la locale initiale suivait `navigator.language` du visiteur
(`resolveInitialLocale`, `frontend/src/i18n/index.ts`). Un robot qui exécute le JavaScript avec
un user-agent/navigateur configuré en anglais pouvait donc se voir servir un rendu avec
`document.documentElement.lang="en"` et une interface anglaise autour d'un contenu français —
exactement la situation incohérente que l'issue veut éliminer, et potentiellement perçue comme
une page anglaise dupliquant le contenu français.

`resolveInitialLocale` ne consulte plus `navigator.language` : en l'absence de choix
explicitement sauvegardé (`localStorage`), elle retourne toujours `fr` (`DEFAULT_LOCALE`). Une
première visite — humaine ou robot, browser localisé en anglais, espagnol ou autre — obtient
donc systématiquement le même rendu français. Le changement de langue reste possible et
persistant (`setLocale`, bouton de l'en-tête, `localStorage`), mais devient un choix explicite
de l'utilisateur, jamais une variation silencieuse selon l'état du client — ce qui correspond à
« interface non indexable » : un robot qui recharge la page sans cookies/`localStorage`
retombe toujours sur le français, jamais sur un état anglais résiduel.

Le gabarit HTML statique (`frontend/index.html`) et donc le rendu SSR (`transformHtmlTemplate`
n'écrase pas `lang` faute d'entrée `htmlAttrs` explicite dans l'app) affichaient déjà
`<html lang="fr">` par défaut ; ce correctif garantit que l'hydratation client ne s'en écarte
plus pour un visiteur sans préférence sauvegardée.

## Critères d'acceptation

- **`html lang`, title, description et contenu principal cohérents** : pour toute URL visitée
  sans préférence explicite (le cas d'un robot), le rendu est intégralement français —
  interface, `<html lang="fr">`, titre/description SEO (`usePageSeo`, basés sur le contenu de
  l'événement) et contenu principal.
- **Rendu de langue déterministe pour les robots** : `resolveInitialLocale()` ne dépend plus que
  d'un choix explicitement sauvegardé ; sans lui, le résultat est toujours `fr`, quel que soit
  `navigator.language`.
- **`hreflang` émis seulement si des pages équivalentes existent** : aucune paire de pages
  traduites n'existe (une seule URL, un seul contenu) — aucune balise `hreflang` n'est donc
  jamais émise (`usePageSeo`, `frontend/src/composables/usePageSeo.ts`), ce que vérifie
  `frontend/tests/usePageSeo.test.ts`.
- **Sitemap et canonicals suivent la stratégie choisie** : `backend/src/seo/sitemap.ts` et
  `usePageSeo` continuent de n'émettre qu'une URL canonique par page, sans variante de langue —
  déjà le cas, inchangé par cette issue.
- **Tests** : navigation directe et absence de préférence locale
  (`frontend/tests/i18n.test.ts`, `navigator.language` variés sans `localStorage`) résolvent
  toutes en `fr` ; changement de langue explicite via le sélecteur de l'en-tête reste testé et
  fonctionnel et persiste dans `localStorage`.

## Hors périmètre

- Traduction du contenu éditorial des événements et URLs localisées (`/fr/...`, `/en/...`) :
  non demandé, nécessiterait un modèle de données et un flux éditorial dédiés — à réévaluer si
  le site vise un public anglophone au-delà d'une préférence d'interface.
- `hreflang`/`x-default` : sans second jeu de pages équivalentes, il n'y a rien à annoncer ; le
  mécanisme n'est pas construit par anticipation (cf. `agents.md` §8 — pas de fonctionnalité V2
  non demandée).
