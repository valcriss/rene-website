# robots.txt et sitemap.xml (#51)

## Ce qui est servi

- `GET /robots.txt` — texte brut (`Content-Type: text/plain`), généré dynamiquement, jamais le
  shell SPA.
- `GET /sitemap.xml` — XML (`Content-Type: application/xml`) conforme au protocole
  [sitemaps.org](https://www.sitemaps.org/protocol.html), généré à la demande à partir de la base.

Les deux routes sont enregistrées dans `backend/src/app.ts` (`createSeoRouter`, module
`backend/src/seo/`), **avant** `registerStatic` : elles répondent donc systématiquement, y compris
en environnement `NODE_ENV=test` où le rendu SSR (`registerStatic`) est désactivé.

## Contenu du sitemap

`backend/src/seo/sitemap.ts` (`buildSitemapXml`) inclut :

- les pages publiques statiques : `/`, `/contact`, `/mentions-legales` (liste
  `STATIC_PUBLIC_PATHS`, tenue à jour avec `KNOWN_STATIC_ROUTES` de `backend/src/static.ts`) ;
- chaque événement **publié et non archivé, disposant d'un slug** (voir
  [`docs/event-slugs.md`](./event-slugs.md)) à son URL canonique `/evenements/<slug>`, avec un
  `<lastmod>` égal à `updatedAt`.

Sont exclus : brouillons, en attente de modération, rejetés, archivés, révisions en cours, et tout
événement publié qui n'aurait pas encore de slug (cas transitoire avant le backfill décrit dans
`docs/event-slugs.md`). Aucune route privée (`/backoffice`, `/login`, aperçus, filtres arbitraires
de l'accueil) n'apparaît : ce ne sont pas des URLs canoniques distinctes.

## Contenu de robots.txt

`backend/src/seo/sitemap.ts` (`buildRobotsTxt`) génère :

```
User-agent: *
Disallow: /backoffice
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: <SITE_URL>/sitemap.xml
```

Cette liste est volontairement identique à celle des routes qui répondent déjà
`X-Robots-Tag: noindex` en SSR (`NOINDEX_ROUTES` et `isBackofficeRoute` dans
`backend/src/static.ts`, mis en place par #48) : `Disallow` empêche le crawl, `noindex` empêche
l'indexation si la page est tout de même atteinte par un autre lien — les deux mécanismes sont
complémentaires et déjà alignés.

## URL absolue

Les deux routes réutilisent `resolveSiteUrl()` (`backend/src/ssr.ts`), la même fonction que le
rendu SSR : `SITE_URL` en production (validée au démarrage, voir `docs/security-secrets.md` et
`docs/seo-metadata.md`), repli sur `http://localhost:<PORT>` en développement.

## Soumission aux moteurs de recherche

Une fois déployé avec un `SITE_URL` de production correct :

1. **Google Search Console** — [ajouter la propriété](https://search.google.com/search-console)
   (vérification par balise, DNS ou fichier), puis Sitemaps → soumettre `sitemap.xml` (URL complète,
   ex. `https://rene-website.example/sitemap.xml`).
2. **Bing Webmaster Tools** — [ajouter le site](https://www.bing.com/webmasters), puis Sitemaps →
   soumettre la même URL. Bing Webmaster Tools peut aussi importer directement une propriété déjà
   vérifiée dans Search Console.
3. Aucune resoumission manuelle n'est nécessaire ensuite : le sitemap est généré à la demande à
   chaque requête et reflète toujours l'état courant de la base (nouveaux événements publiés,
   événements archivés retirés).

## Tests

- `backend/tests/seo.sitemap.test.ts` : contenu de `robots.txt` (routes interdites, ligne
  `Sitemap:`), sitemap sur base vide, événement publié/lastmod, exclusion brouillon/en
  attente/rejeté/archivé/sans slug, échappement XML.
- `backend/tests/seo.routes.test.ts` : types MIME, `SITE_URL` explicite vs repli localhost, erreur
  500 si le dépôt échoue.
