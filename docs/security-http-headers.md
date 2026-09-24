# Headers HTTP et HTTPS

L'application désactive `X-Powered-By` et applique une CSP bloquante sur chaque réponse. Elle interdit les plugins, l'encadrement et les scripts externes ou évalués. La CSP autorise uniquement les ressources nécessaires : l'application, Google Fonts (`fonts.googleapis.com` et `fonts.gstatic.com`), les images HTTPS (affiches et tuiles OpenStreetMap), et les URI `data:`/`blob:` nécessaires aux aperçus locaux.

`style-src 'unsafe-inline'` est l'unique exception temporaire : Vue et Leaflet écrivent des styles de position/couleur directement dans le DOM. Il ne s'applique pas aux scripts. Une suppression future de ces styles dynamiques devra retirer cette exception.

Les pages d'authentification, le backoffice et les réponses d'un utilisateur authentifié sont marqués `Cache-Control: no-store`. Les assets Vite et les images WebP gardent leurs politiques de cache dédiées.

## Déploiement HTTPS

Par défaut, ni HSTS ni redirection ne sont simulés localement. En production derrière un reverse proxy maîtrisé :

1. Le proxy termine TLS, redirige HTTP vers HTTPS et remplace les en-têtes `X-Forwarded-*` entrants.
2. Définir `TRUST_PROXY_HOPS=1` uniquement si ce proxy est le seul saut de confiance.
3. Définir `FORCE_HTTPS=true` et un `SITE_URL` en `https://…` pour rediriger les requêtes HTTP résiduelles vers l'origine configurée, sans refléter l'en-tête `Host`.
4. Après vérification des sous-domaines, augmenter progressivement HSTS au-delà de `max-age=86400`. `includeSubDomains` et `preload` ne doivent être ajoutés qu'après une décision d'exploitation explicite.

Pour une phase d'observation, définir temporairement `CSP_REPORT_ONLY=true`. Elle remplace le header bloquant par `Content-Security-Policy-Report-Only`; revenir à `false` après analyse, car le mode report-only ne protège pas les visiteurs.

Le contrôle local équivalent à Mozilla Observatory consiste à vérifier les headers depuis le point de terminaison HTTPS public :

```bash
curl -sSI https://example.org/ | rg 'content-security-policy|strict-transport-security|referrer-policy|permissions-policy'
```
