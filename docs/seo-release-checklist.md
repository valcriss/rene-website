# Checklist de recette SEO (#58)

À exécuter avant toute mise en production, en plus de la CI habituelle (lint/test/build). Détails
et justifications dans [docs/seo-monitoring.md](./seo-monitoring.md).

- [ ] `npm test` est vert — inclut `frontend/tests/seoRegression.test.ts`, qui échoue déjà
      automatiquement si un titre, une description, un canonical, une balise Open Graph, un
      JSON-LD ou un H1 a régressé sur une page publique représentative.
- [ ] `npm run check:bundle-size -w frontend` est vert (budget de performance déterministe, #53).
- [ ] `npm run build -w frontend && npm run lighthouse -w frontend` exécuté localement : SEO,
      Accessibilité et Bonnes pratiques au-dessus de leur budget sur l'accueil et la page
      `/agenda/ce-week-end` (Performance affichée pour information, non bloquante — voir
      docs/seo-monitoring.md §2).
- [ ] Après déploiement : `curl -sI <SITE_URL>/robots.txt` et `curl -sI <SITE_URL>/sitemap.xml`
      répondent `200` et pointent vers le bon domaine (`SITE_URL`).
- [ ] Si une page ou un modèle d'URL a changé (nouvelle route publique, changement de slug...) :
      soumettre à nouveau le sitemap dans Search Console et Bing Webmaster Tools.
- [ ] Si `useStructuredData`/`useEventStructuredData` a changé : valider une fiche événement en
      production avec le [Rich Results Test](https://search.google.com/test/rich-results).
- [ ] `npx linkinator <SITE_URL>/sitemap.xml --recurse` (ou équivalent) ne rapporte aucun lien
      cassé ni redirection en boucle.
- [ ] Consulter Search Console (Indexation → Pages) pour une nouvelle erreur de couverture
      apparue depuis la dernière recette.

Ownership et cadence de suivi hors mise en production : voir
[docs/seo-monitoring.md §7](./seo-monitoring.md#7-alertes-et-responsable-de-suivi).
