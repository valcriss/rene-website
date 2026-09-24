# Images, polices, cache et Core Web Vitals (#53)

## Périmètre

Cette issue est bloquante mais large ; ce qui suit couvre les leviers concrets et vérifiables en
CI/tests décrits ci-dessous. La mesure réelle des Core Web Vitals (LCP/INP/CLS au 75e percentile,
Lighthouse CI, Search Console) fait l'objet de l'issue #58 dédiée — ce document ne prétend pas
prouver ces seuils, seulement documenter les optimisations qui y contribuent et ce qui est
effectivement vérifié aujourd'hui.

## Polices

`frontend/src/styles.css` chargeait Google Fonts via `@import url(...)`. Un `@import` CSS force le
navigateur à télécharger et parser la feuille de style avant même de découvrir la requête vers
`fonts.googleapis.com`, ajoutant un aller-retour complet à la chaîne critique de rendu.

Remplacé par des balises `<link>` dans `frontend/index.html` :

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?..." />
```

Le navigateur découvre la requête dès le parsing du HTML, en parallèle du CSS/JS de l'application,
au lieu d'attendre la fin du parsing de `styles.css`. Aucun auto-hébergement n'a été mis en place :
la mesure (Lighthouse, #58) doit dire si le gain est suffisant avant d'investir dans le
subsetting/auto-hébergement, conformément à la consigne de l'issue ("preload seulement si mesuré
utile").

## Images

- **Pipeline d'upload** (`backend/src/uploads/processor.ts`, `MAX_UPLOAD_WIDTH = 1600`) : toute
  image tésversée est désormais redimensionnée à une largeur maximale de 1600 px
  (`withoutEnlargement: true` — jamais d'agrandissement d'un original plus petit) avant l'encodage
  WebP déjà en place. Aucune image publique n'est affichée plus large que ça dans l'UI ; ça borne
  le poids envoyé sans jamais dégrader une image déjà correctement dimensionnée.
- **Attributs de chargement** sur les `<img>` publics :
  - Candidates LCP (carrousel de la page d'accueil, image principale de la fiche événement) :
    `loading="eager"`, `fetchpriority="high"`, `decoding="async"` — chargées et décodées en
    priorité, sans bloquer le thread principal.
  - Images sous la ligne de flottaison (grille d'événements, événements associés) :
    `loading="lazy"`, `decoding="async"` — différées jusqu'à l'approche du viewport.
- **CLS** : les conteneurs d'image (carrousel, grille, événements associés) utilisent déjà un
  ratio d'aspect Tailwind fixe (`aspect-[16/10]`) ou une hauteur minimale fixe indépendante de
  l'image chargée — l'espace réservé ne bouge donc pas quand l'image apparaît, qu'elle charge vite
  ou lentement.
- Pas de variantes responsive (`srcset`/`sizes`) ni AVIF dans cette itération : cela suppose de
  stocker plusieurs tailles/formats par image et d'exposer leurs dimensions, un changement de
  schéma plus large que ce qui est raisonnable dans une seule PR ; à réévaluer une fois les gains
  du redimensionnement/format WebP actuel mesurés (#58).

## Carte (Leaflet)

`EventMap.vue` importait déjà Leaflet dynamiquement (`import("leaflet")`) uniquement côté client,
mais dès le montage du composant — sans tenir compte de la position de la carte dans la page.
Elle est maintenant montée via `IntersectionObserver` (`rootMargin: "200px"`) : l'import de
Leaflet, l'initialisation de la carte et les tuiles OpenStreetMap ne se déclenchent que lorsque son
conteneur approche du viewport. Repli sur un montage immédiat si `IntersectionObserver` n'existe
pas (navigateur très ancien). L'adresse textuelle de l'événement reste affichée indépendamment de
la carte (résumé de localisation, lien "Itinéraire") : aucune information n'est perdue sans JS ou
avant que la carte ne charge.

## Cache HTTP

`backend/src/static.ts` servait tous les fichiers de `frontend/dist/client` (y compris les assets
avec un hash de contenu dans leur nom, générés par Vite) avec le comportement par défaut
d'`express.static`, soit `Cache-Control: public, max-age=0` — jamais de cache réel.

Désormais différencié via `setHeaders` :

- `dist/client/assets/*` (noms hashés par Vite — un changement de contenu change toujours l'URL) :
  `public, max-age=31536000, immutable`.
- Tout le reste servi depuis ce répertoire (`index.html`, `logo.svg`, `mark.png` — l'URL ne change
  pas d'un déploiement à l'autre) : `no-cache` (revalidation systématique).

Les images téléversées (`/uploads/:filename`, servies par `backend/src/uploads/routes.ts`) avaient
déjà `public, max-age=31536000, immutable` — noms de fichiers en UUID, donc déjà content-addressés
— aucun changement nécessaire là.

## Compression HTTP

`compression` (middleware Express, filtre par défaut basé sur le `Content-Type`) est monté en tout
premier dans `backend/src/app.ts`, avant tout autre middleware : compresse les réponses API JSON,
le HTML rendu en SSR, `robots.txt`/`sitemap.xml` et les assets texte, pour tout client annonçant
`Accept-Encoding: gzip`. Les images déjà encodées en WebP ne sont pas recompressées : leur
`Content-Type` (`image/webp`) n'est pas dans la liste des types compressibles du filtre par défaut
de la librairie.

## Budget JS/CSS, vérifié en CI

`frontend/scripts/checkBundleSize.mjs` (exécuté via `npm run check:bundle-size -w frontend`, ajouté
comme étape dans `.github/workflows/ci.yml` juste après `npm run build`) mesure la taille gzip de
chaque chunk `dist/client/assets/*` dont le nom commence par un préfixe budgété, et échoue (exit
1) si l'un dépasse sa limite :

| Préfixe | Budget (gzip) | Concerne |
|---|---|---|
| `index-` | 60 KB | socle applicatif (Vue, router, Pinia, i18n runtime, UI partagée) |
| `vue-i18n-` | 55 KB | runtime i18n |
| `leaflet-src-` | 55 KB | carte (chargée à la demande, cf. ci-dessus) |
| `free-solid-svg-icons-` | 35 KB | icônes utilisées sur les pages publiques |
| `pinia-` | 5 KB | store |
| `Header-` | 4 KB | en-tête de navigation |
| `HomePage-` | 12 KB | page d'accueil |
| `EventDetailView-` | 28 KB | vue détail d'un événement |
| `EventDetailPage-` | 3 KB | page détail (wrapper) |
| CSS (`*.css`) | 20 KB | feuille de style principale |

Seuls les chunks pouvant se charger sur une page publique/indexable sont budgétés — les pages du
backoffice (éditeur d'événement, administration, modération), jamais servies à un visiteur anonyme,
n'ont pas d'enjeu Core Web Vitals public et ne sont pas listées ici. Les limites incluent une marge
d'environ 30 à 40 % au-dessus de la taille actuelle (voir les commentaires du script) : l'objectif
est de détecter une régression future, pas de contraindre artificiellement la taille actuelle.

## Tests

- `backend/tests/uploads.processor.test.ts` : redimensionnement d'une image plus large que la
  limite (aspect ratio conservé), image plus petite laissée intacte.
- `backend/tests/static.test.ts` : `Cache-Control: no-cache` pour un fichier non hashé,
  `public, max-age=31536000, immutable` pour un fichier sous `/assets/`.
- `backend/tests/compression.test.ts` : `Content-Encoding: gzip` sur une réponse JSON
  suffisamment volumineuse, absence de compression sous le seuil par défaut de la librairie.
- `frontend/tests/eventMap.test.ts` : la carte ne s'initialise pas tant que le conteneur n'a pas
  été signalé comme intersectant, s'initialise dès l'intersection, et se rabat sur un montage
  immédiat si `IntersectionObserver` est absent.
- Vérification manuelle : `npm run build -w frontend && npm run check:bundle-size -w frontend`
  contre le build réel (voir la sortie du script, incluse dans la session de travail).
