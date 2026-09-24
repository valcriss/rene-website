# Métadonnées SEO et sociales par page

Chaque page publique expose désormais un titre unique, une meta description, une URL
canonique absolue, des balises Open Graph et une X/Twitter Card — toutes présentes dans le
HTML initial servi par le rendu côté serveur (issue #46), pas seulement injectées après
hydratation.

## Bibliothèque utilisée

[`@unhead/vue`](https://unhead.unjs.io/) gère les balises `<head>` de façon isomorphe
(identique côté serveur et client) :

- `frontend/src/appFactory.ts` installe un client `unhead` par requête (`@unhead/vue/client`
  côté navigateur, `@unhead/vue/server` côté serveur — jamais le même import pour les deux,
  leurs comportements par défaut diffèrent).
- `backend/src/ssr.ts` appelle `transformHtmlTemplate` (paquet `unhead/server`) après le rendu
  Vue : elle extrait les balises déjà présentes dans le gabarit `index.html`, les fusionne avec
  celles enregistrées par les composants via `useHead`/`useSeoMeta`, et réinjecte le résultat
  dans le HTML final. Cet import est chargé paresseusement (comme `vite` pour le rendu de
  développement) car `unhead/server` est un paquet ESM strict : un import statique ferait
  échouer tout test backend import ant `app.ts` sans mocker `unhead/server`.
- `unhead` (le paquet cœur) n'est pas déclaré comme dépendance directe du backend : il est
  fourni de façon exacte par la dépendance propre d'`@unhead/vue` (même principe que
  `@vue/server-renderer` pour Vue, voir `docs/ssr-architecture.md`), pour ne jamais désynchroniser
  les deux versions.

## Composable partagé

`frontend/src/composables/usePageSeo.ts` centralise la logique commune à toutes les pages
publiques : titre, description, canonical, Open Graph (`og:title`, `og:description`,
`og:type`, `og:url`, `og:image` + dimensions/alt) et X Card
(`twitter:card=summary_large_image`). Chaque page publique l'appelle avec ses propres valeurs :

- `HomePage.vue` — titre/introduction éditoriaux (configurables en back-office, avec repli i18n).
- `EventDetailPage.vue` — titre, description construite depuis le contenu de l'événement,
  image, `og:type=article`. Volontairement appelé depuis la page de route publique et non
  depuis le composant `EventDetailView.vue` partagé, pour ne jamais poser de métadonnées
  publiques trompeuses sur l'aperçu back-office qui réutilise ce même composant.
- `ContactPage.vue`, `LegalNoticePage.vue` — titre/description institutionnels.

Le backoffice et les pages d'authentification n'appellent jamais ce composable : elles
conservent le titre générique statique du gabarit (`<title>R3ne</title>`) sans balise Open
Graph ni description, en plus de l'en-tête `X-Robots-Tag: noindex` déjà posé par
`backend/src/static.ts` (issue #48). Voir le test
`entry-server render > never emits public Open Graph/description metadata for private routes`.

## Description et image

- `frontend/src/utils/seo.ts` fournit `buildPlainTextDescription` (nettoie le HTML riche,
  décode les entités, tronque à une limite de mots sans jamais couper un tag) et
  `toAbsoluteUrl` (résout un chemin relatif — image d'événement, image de marque par défaut —
  en URL absolue, obligatoire pour Open Graph/X Card).
- `DEFAULT_OG_IMAGE_PATH` (`/logo.svg`) sert de repli quand un événement n'a pas d'image.
  Limitation connue : c'est un SVG, format que certains crawlers de partage social (Facebook,
  LinkedIn) ne rendent pas toujours de façon fiable. Un vrai visuel de marque au format
  PNG/JPEG serait une amélioration future, hors périmètre de cette issue (travail de design,
  pas de code).

## URL absolue (`SITE_URL`)

- Nouvelle variable d'environnement `SITE_URL`, validée au démarrage en production
  (`backend/src/config/environment.ts`, réutilise le même `validateHttpUrl` que `PHOTON_URL`).
- Côté serveur, `backend/src/ssr.ts` la lit (repli sur `http://localhost:<PORT>` hors
  production, où elle n'est pas obligatoire) et la transmet à `entry-server.ts`.
- Côté client, `frontend/src/composables/useSiteUrl.ts` retombe simplement sur
  `window.location.origin`, toujours exact dans un navigateur — aucune valeur n'a besoin
  d'être exposée au bundle client au moment du build.
- Documentée dans `.env.example`, `docker-compose.yml` et `docs/security-secrets.md`.

## `html lang`

Le gabarit statique porte `lang="fr"`, mais unhead ne garantit pas de conserver cette valeur
extraite du template comme valeur initiale (son propre défaut peut la remplacer). `App.vue`
fixe donc explicitement `useHead({ htmlAttrs: { lang: getCurrentLocale() } })` une fois au
montage — le rendu serveur est toujours en français (voir `docs/ssr-architecture.md`), donc
cette valeur est toujours correcte au premier rendu. Les changements de langue côté client
restent gérés par le watcher déjà existant dans `frontend/src/i18n/index.ts`
(`document.documentElement.lang = ...`), qui prend le relais après le montage initial.

## Vérifié en direct

Serveur de production réel construit et démarré, réponses HTTP brutes inspectées avec `curl` :
titre, description, canonical, toutes les balises Open Graph, la carte X et `html lang="fr"`
sont bien présents dans le HTML initial pour `/`, `/contact` et `/mentions-legales` ; `/login`
ne reçoit aucune balise Open Graph ni description, conserve `X-Robots-Tag: noindex`.

## Hors périmètre / suivi manuel

- La validation avec le débogueur de partage Facebook/LinkedIn et un validateur de X Card
  nécessite une URL publiquement accessible ; à faire une fois le site déployé sur son domaine
  définitif (aucun outil automatisé ne peut s'y substituer depuis cet environnement).
- Les données structurées JSON-LD (`Event`, `WebSite`) sont couvertes par l'issue #52.
- `robots.txt`/`sitemap.xml` restent dans le périmètre de l'issue #51.
