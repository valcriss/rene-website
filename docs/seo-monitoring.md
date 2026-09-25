# Suivi SEO, Search Console et Lighthouse (#58)

## Ce que ce document couvre

Le socle SEO (#45-#57) est en place : rendu SSR, métadonnées, sitemap, données structurées,
pages locales, partage social, stratégie multilingue. Cette issue ne construit plus de
fonctionnalité produit — elle met en place la mesure et la garde-fou contre les régressions.

## 1. Recette SEO automatisée (le vrai garde-fou de CI)

`frontend/tests/seoRegression.test.ts` fait tourner le rendu SSR réel (le même `render()` que le
serveur de production, `src/entry-server.ts`) sur les pages publiques représentatives — accueil,
fiche événement, page agenda week-end (évergreen), page agenda ville, mentions légales, route
inconnue — et vérifie pour chacune :

- un `<title>` propre à la page (jamais le générique de secours) ;
- une meta description non vide ;
- un `<link rel="canonical">` absolu ;
- les balises Open Graph et X/Twitter Card ;
- les données structurées JSON-LD attendues (`WebSite` sur l'accueil, `Event` sur une fiche) ;
- exactement un `<h1>` ;
- l'absence de toute balise `hreflang` (issue #57 : aucune page équivalente traduite n'existe) ;
- qu'une route privée ou une route inconnue n'expose aucune métadonnée publique.

C'est un test au sens propre : il fait partie de `npm test` et **échoue la CI** dès qu'un de ces
éléments régresse, sans seuil numérique instable — c'est du binaire (l'élément est là et correct,
ou non). Les statuts HTTP (200/301/404, `noindex`) sont couverts séparément par
`backend/tests/static.test.ts` et `backend/tests/seo.sitemap.test.ts` (issues #48, #56) et ne sont
pas dupliqués ici.

## 2. Lighthouse (mesure locale, pas un gate CI)

`npm run lighthouse -w frontend` (`frontend/scripts/checkLighthouse.mjs`) démarre le backend en
mode dev (base en mémoire, aucun secret requis — le même mode que `npm run dev -w backend`),
audite l'accueil et la page agenda week-end avec Lighthouse, et vérifie des budgets versionnés sur
les catégories **SEO, Accessibilité et Bonnes pratiques** (structurelles, donc stables). La
catégorie **Performance** est mesurée et affichée mais jamais comparée à un budget : son score
dépend fortement du CPU/de la charge de la machine qui l'exécute, et un budget dessus serait
exactement le « seuil arbitraire instable » que l'issue demande d'éviter. Le budget de bundle
JS/CSS (`npm run check:bundle-size -w frontend`, issue #53), lui, est déterministe (taille gzip)
et reste le garde-fou de performance en CI.

Nécessite `npm run build -w frontend` au préalable (le script explique comment si le build est
absent) et un Chrome/Chromium local. **Volontairement pas câblé dans la CI obligatoire** — voir
raisonnement ci-dessus — à lancer manuellement avant chaque mise en production, comme indiqué dans
[la checklist de recette](./seo-release-checklist.md).

## 3. Google Search Console et Bing Webmaster Tools

Procédure (aucun secret à committer — la vérification se fait par un enregistrement DNS ou un
fichier public, pas par une clé stockée dans le dépôt) :

1. **Google Search Console** (https://search.google.com/search-console) : ajouter une propriété
   « Préfixe d'URL » sur `SITE_URL` (voir `.env.example`). Vérification recommandée : enregistrement
   DNS TXT sur le domaine (ne dépend d'aucun fichier du dépôt, survit à un redéploiement).
2. **Bing Webmaster Tools** (https://www.bing.com/webmasters) : Bing propose d'importer
   directement une propriété déjà vérifiée sur Google Search Console — à privilégier pour éviter
   une seconde vérification manuelle.
3. Dans les deux outils, soumettre `SITE_URL/sitemap.xml` (généré dynamiquement, voir
   [docs/seo-sitemap.md](./seo-sitemap.md)) dans la section Sitemaps.
4. Donner l'accès aux personnes qui doivent consulter le tableau de bord via
   Paramètres → Utilisateurs et autorisations (accès nominatif Google, pas de secret partagé).

## 4. Tableau de bord à surveiller

À consulter à une cadence régulière (mensuelle recommandée, ou après chaque mise en production
significative) :

| Source | Ce qu'on regarde | Où |
|---|---|---|
| Search Console | Pages indexées vs. exclues, erreurs de couverture | Indexation → Pages |
| Search Console | Erreurs/avertissements du sitemap soumis | Indexation → Sitemaps |
| Search Console | Core Web Vitals (LCP, INP, CLS) mobile/desktop | Expérience → Signaux Web essentiels |
| Search Console | Requêtes, clics, impressions, position moyenne | Performances |
| Search Console | Résultats enrichis Event (erreurs/avertissements) | Améliorations → Événements |
| Bing Webmaster Tools | Équivalents Bing des points ci-dessus | Tableau de bord Bing |
| Rich Results Test (https://search.google.com/test/rich-results) | Validation ponctuelle du JSON-LD sur une fiche événement en production | Après tout changement touchant `useStructuredData` |

### Baseline

Avant la première mise en production de ce socle SEO, puis après, consigner un relevé daté dans
le tableau ci-dessous (à compléter manuellement — ces métriques vivent dans Search Console, pas
dans le dépôt) :

| Date | Contexte | Pages indexées | LCP mobile (p75) | INP mobile (p75) | CLS mobile (p75) | Erreurs sitemap |
|---|---|---|---|---|---|---|
| _à renseigner_ | Avant mise en prod du socle SEO | | | | | |
| _à renseigner_ | +30 jours après mise en prod | | | | | |

## 5. Scan des liens cassés et URLs orphelines

Aucune infrastructure de crawl périodique n'existe dans ce dépôt (elle nécessiterait un
ordonnanceur externe frappant le site en production, hors du périmètre d'un dépôt de code). En
attendant, exécuter ponctuellement, à chaque recette de mise en production :

```bash
npx linkinator https://<SITE_URL>/sitemap.xml --recurse
```

(ou tout autre link-checker équivalent) — à ajouter à la checklist de recette. Une automatisation
périodique dédiée (job planifié externe) pourra être envisagée séparément si le volume de contenu
le justifie un jour — hors périmètre ici pour rester proportionné (agents.md §8).

## 6. Mesure analytics (RGPD)

**Décision explicitement non prise dans cette issue.** Aucun outil analytics n'est intégré tant
que l'outil et le mécanisme de consentement n'ont pas fait l'objet d'une décision produit
explicite (bannière de consentement, base légale, éventuel proxy respectueux de la vie privée) —
conformément à la formulation de l'épique elle-même (« seulement après décision explicite sur
l'outil et le consentement ») et à la règle du projet de ne pas introduire de fonctionnalité non
demandée. Search Console fournit déjà, sans aucun traceur supplémentaire, les requêtes/clics/
impressions listés ci-dessus.

## 7. Alertes et responsable de suivi

- **Responsable de suivi** : le mainteneur du dépôt (`valcriss`), à réassigner explicitement si le
  suivi est délégué à quelqu'un d'autre — aucun nom d'équipe n'existe encore dans le projet pour
  en décider à sa place.
- **Alertes** : Search Console envoie nativement des emails aux utilisateurs déclarés de la
  propriété en cas de nouvelle erreur de couverture, de désindexation manuelle ou de nouveau
  problème de Core Web Vitals — aucune configuration supplémentaire requise au-delà de l'étape 4
  ci-dessus (donner l'accès aux bonnes personnes).
- La checklist de recette ([docs/seo-release-checklist.md](./seo-release-checklist.md)) est le
  filet de sécurité à chaque mise en production, entre deux cycles d'alerte Search Console.
