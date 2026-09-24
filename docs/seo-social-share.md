# Partage natif et liens de partage social (#54)

## Problème

Le bloc « Réseaux sociaux » de la fiche événement ouvre les comptes renseignés par
l'organisateur (Facebook, Instagram, LinkedIn, X, TikTok, YouTube) — c'est un lien de
**suivi**, pas de **partage** de la fiche R3ne elle-même. Sans action dédiée, un visiteur qui
veut relayer l'événement doit copier l'URL manuellement.

## Ce qui a été ajouté

`frontend/src/components/events/ShareEvent.vue`, un nouveau bloc « Partager cet événement »
inséré dans `EventDetailView.vue` juste après le bloc `detail-social-links` existant, avec un
style visuellement distinct (bordure/fond émeraude vs. bleu ciel pour « suivre l'organisateur »)
pour qu'un visiteur ne confonde jamais les deux actions.

Le bloc comprend :

- **Bouton de partage natif** (Web Share API, `navigator.share`) : affiché uniquement quand
  l'API est disponible dans le navigateur, avec le titre de l'événement et l'URL canonique.
- **Bouton « Copier le lien »**, toujours visible : Clipboard API (`navigator.clipboard.writeText`)
  avec repli sur un `<textarea>` hors écran + `document.execCommand("copy")` pour les navigateurs
  ou contextes qui n'exposent pas l'API asynchrone. Un message de confirmation non intrusif
  (`role="status"`, `aria-live="polite"`) apparaît sous les boutons et disparaît de lui-même après
  2,5 secondes ; en cas d'échec des deux méthodes, un message d'erreur s'affiche à la place.
- **Liens de partage explicites**, toujours visibles, vers Facebook, LinkedIn et X — construits
  uniquement à partir de l'URL canonique encodée (voir `frontend/src/utils/shareLinks.ts`) :
  - Facebook : `https://www.facebook.com/sharer/sharer.php?u=<url encodée>`
  - LinkedIn : `https://www.linkedin.com/sharing/share-offsite/?url=<url encodée>`
  - X : `https://x.com/intent/tweet?url=<url encodée>&text=<titre encodé>`

  Ce sont de simples liens `<a target="_blank" rel="noopener noreferrer">` : aucun SDK ni pixel
  tiers n'est chargé, et aucune requête ne part vers un réseau social avant un clic explicite du
  visiteur.

## URL canonique

Le partage utilise systématiquement la même URL canonique que les balises `<link rel="canonical">`
et Open Graph déjà posées par `usePageSeo` (issue #47) : `toAbsoluteUrl(useSiteUrl(),
getEventDetailPath(event))`, calculée dans `EventDetailView.vue` (`shareUrl`, une nouvelle
computed) et passée en prop à `ShareEvent`. C'est le chemin slug-based de l'issue #50
(`/evenements/:slug`, avec repli sur `/event/:id` tant qu'un événement n'a pas encore de slug) —
jamais `window.location.href`, qui pourrait pointer vers une URL legacy en attente de sa
redirection 301.

## Accessibilité et comportement

- Tous les contrôles sont des éléments natifs (`<button>`, `<a>`) : navigables au clavier sans
  ajout de `tabindex`.
- Le bouton « Copier le lien » et chaque lien de réseau portent un `aria-label` et un `title`
  explicites (ex. « Copier le lien », « Partager sur Facebook »).
- Le message de confirmation/erreur après copie est annoncé aux lecteurs d'écran via
  `aria-live="polite"` sans déplacer le focus.
- Le bouton de partage natif est absent du HTML tant que sa disponibilité n'a pas été vérifiée
  côté client (`onMounted`, jamais exécuté en SSR) : évite un écart d'hydratation entre le HTML
  rendu côté serveur (où `navigator` n'existe pas) et le premier rendu client.
- Un clic annulé ou refusé sur la boîte de partage native (ex. l'utilisateur ferme la feuille de
  partage) est silencieusement ignoré — ce n'est pas une erreur à signaler.

## Tests

- `frontend/tests/shareLinks.test.ts` : URLs Facebook/LinkedIn/X correctement construites et
  encodées (y compris caractères réservés `&`, espaces, accents).
- `frontend/tests/shareEvent.test.ts` : liens explicites toujours présents avec leurs libellés
  accessibles ; bouton natif absent/présent selon la disponibilité de `navigator.share` et appelé
  avec le bon titre/URL ; annulation silencieuse d'un partage natif rejeté ; copie réussie via le
  Clipboard API avec confirmation qui s'efface après le délai ; repli sur `execCommand` quand le
  Clipboard API est absent ou rejette ; état d'erreur quand les deux méthodes échouent ; nettoyage
  du minuteur de confirmation au démontage.

Vérification manuelle : `npm run lint`, `npm run test -- --coverage` (frontend, 500 tests,
95 %+ de couverture globale, seuil à 80 %), `npm run build` (client + SSR) et
`npm run check:bundle-size` (le chunk `EventDetailView-*.js` reste à 19 KB gzip, sous son budget
de 28 KB) exécutés avec succès. Un contrôle visuel en navigateur réel n'a pas pu être fait dans cet
environnement (pas de base Postgres/SMTP configurée pour démarrer le serveur en mode production) ;
la couverture de tests unitaires ci-dessus exerce chaque branche interactive du composant
(bouton natif visible/masqué, copie réussie/repli/échec, liens explicites).

## Hors périmètre

- Pas de SDK/pixel de réseau social, conformément à la consigne de l'issue.
- Pas de mesure analytics des partages dans cette itération — l'issue demande de « prévoir » une
  métrique respectueuse du consentement *si* une solution analytics est retenue ; aucune solution
  de ce type n'existe encore dans le projet, donc rien n'a été ajouté ici pour rester scopé
  (à réévaluer si/quand un outil analytics respectueux du consentement est introduit).
