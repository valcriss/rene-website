# Architecture de rendu SSR

Issue #46 demandait de choisir et documenter une architecture rendant le HTML des pages
publiques exploitable sans exécuter de JavaScript (crawlers, robots de partage social). Deux
options ont été évaluées :

- **SSR à la demande** avec `@vue/server-renderer` : le serveur rend l'application Vue réelle
  à chaque requête, puis le client hydrate le même arbre par-dessus.
- **Prérendu/SSG** : générer des instantanés HTML statiques par événement, régénérés à chaque
  publication/mise à jour/archivage, servis à la place de la coquille SPA.

Le SSR à la demande a été retenu : le contenu est toujours à jour avec la base (pas de cache à
invalider), et il réutilise les composants Vue réels — impossible que le rendu serveur diverge
du rendu client puisque c'est littéralement le même arbre de composants.

## Périmètre

Seules les routes publiques indexables sont rendues côté serveur : `/`, `/event/:id`,
`/contact`, `/mentions-legales`. Le backoffice et les pages d'authentification restent en
CSR pur (déjà exclues de l'indexation par `X-Robots-Tag: noindex`, sans valeur SEO) : les
rendre en SSR n'aurait apporté aucun bénéfice pour un risque de régression bien plus élevé
(éditeur de texte riche, recadrage d'image, formulaires complexes). Les 200/404/410 posés par
l'issue #48 sont conservés à l'identique ; seul le corps de la réponse change (HTML rendu au
lieu de la coquille SPA brute) pour ces quatre routes.

## Fonctionnement

- `frontend/src/appFactory.ts` — fabrique partagée (`createSSRApp` + Pinia + routeur + i18n),
  appelée à chaque requête serveur pour obtenir une instance fraîche (aucun état partagé entre
  requêtes concurrentes).
- `frontend/src/entry-server.ts` — pousse l'URL dans le routeur, attend `router.isReady()`,
  appelle `renderToString`, puis sérialise l'état Pinia dans une balise
  `<script id="__PINIA_STATE__" type="application/json">` (les `<` sont échappés en `<`
  pour qu'un contenu d'événement contenant `</script>` ne puisse pas fermer la balise
  prématurément).
- `frontend/src/entry-client.ts` — recrée la même application, réhydrate l'état Pinia depuis
  cette balise si présente, puis monte après `router.isReady()`. `createSSRApp` fait qu'une
  route non rendue côté serveur (coquille vide) bascule simplement en montage client classique.
- `backend/src/ssr.ts` — en production, lit le `index.html` déjà construit
  (`frontend/dist/client/index.html`) et importe dynamiquement le bundle serveur déjà construit
  (`frontend/dist/server/entry-server.js`) ; en développement, crée un serveur Vite en
  `middlewareMode` et utilise `ssrLoadModule`/`transformIndexHtml`, avec rechargement à chaud du
  code source (aucun build préalable requis en dev). Vite n'est jamais importé sur le chemin de
  production.
- `backend/src/static.ts` — classe toujours les requêtes comme en #48, mais les quatre routes
  publiques passent maintenant par le renderer SSR au lieu de `sendFile(indexPath)`.

## Build

`frontend/npm run build` exécute deux passes Vite : `vite build` (client, sortie
`dist/client`) puis `vite build --ssr src/entry-server.ts` (sortie `dist/server`). L'image
Docker (mono-image existante) copie `frontend/dist` tel quel ; aucun changement du
`Dockerfile` n'était nécessaire au-delà de ça.

## Contraintes de compatibilité SSR levées

Plusieurs bibliothèques front supposaient un navigateur ; render server-side aurait planté
sans ces ajustements, tous scopés au strict nécessaire :

- **Leaflet** (`EventMap.vue`) touche `window`/`document` dès son import. Le chargement est
  repoussé dans `onMounted` via un `import()` dynamique, qui ne s'exécute jamais côté serveur
  (Vue n'appelle pas les hooks `onMounted` pendant `renderToString`).
- **DOMPurify** a besoin d'un vrai DOM pour construire son instance. `EventDetailView.vue`
  utilise désormais `isomorphic-dompurify` (backée par `jsdom` côté serveur, par le DOM du
  navigateur côté client) au lieu du paquet `dompurify` importé directement.
- **`window.localStorage`** était lu sans garde dans `stores/auth.ts` et
  `api/authHeaders.ts` (à chaque instanciation du store, donc à chaque page). Un visiteur
  anonyme côté serveur est exactement ce qu'un crawler anonyme doit voir : ces accès sont
  désormais gardés par `typeof window !== "undefined"`, avec repli sur une session VISITOR.
- **`vue` et `@vue/server-renderer`** doivent être strictement à la même version (couplage
  interne non garanti autrement entre versions mineures) ; on ne déclare plus
  `@vue/server-renderer` comme dépendance directe et on laisse `vue` fournir sa propre
  dépendance interne, qui est toujours exactement alignée.
- **Chargement de données** : les récupérations de données déclenchées dans `onMounted`
  (catégories, publics, réglages) ou dans un `watch({ immediate: true })` fire-and-forget
  (liste des événements) ne s'exécutaient pas — ou pas de façon attendue par le rendu — côté
  serveur. Elles sont maintenant aussi enregistrées via `onServerPrefetch`, une API Vue conçue
  pour ce cas précis : no-op côté client, attendue par `renderToString` côté serveur.

## Locale

Le rendu serveur utilise toujours la locale par défaut (`fr`) : `resolveInitialLocale()` ne
lit `localStorage`/`navigator.language` que côté client, donc côté serveur elle retombe sur
`DEFAULT_LOCALE`. L'instance `i18n` est un singleton partagé entre requêtes, mais comme aucune
route SSR ne change jamais sa locale, cela ne crée aucune fuite d'état entre requêtes
concurrentes. Le changement de langue reste une fonctionnalité 100 % client après hydratation.

## Hors périmètre

- La génération de `robots.txt`/`sitemap.xml` reste dans le périmètre de l'issue #51.
- Les métadonnées SEO par page (meta description, canonical, Open Graph, JSON-LD) sont
  couvertes par les issues #47 et #52, qui s'appuient sur ce socle de rendu serveur.
