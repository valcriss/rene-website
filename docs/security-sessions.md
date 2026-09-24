# Sécurité des sessions

L’authentification du navigateur repose sur deux cookies et une protection CSRF en double soumission. Aucun JWT, identifiant de session ou refresh token n’est exposé à JavaScript ni conservé dans `localStorage` ou `sessionStorage`.

## Jetons et cookies

| Cookie | Contenu | Durée | Portée | Attributs |
| --- | --- | --- | --- | --- |
| `rene_access` | JWT d’accès | 15 minutes | `/api` | `HttpOnly`, `Secure` en production, `SameSite=Strict` |
| `rene_refresh` | Secret opaque aléatoire | 8 heures maximum | `/api/auth` | `HttpOnly`, `Secure` en production, `SameSite=Strict` |
| `rene_csrf` | Secret CSRF non authentifiant | 8 heures maximum | `/` (lecture requise par la SPA) | `Secure` en production, `SameSite=Strict` |

Le JWT est signé exclusivement en `HS256`. Le backend impose l’émetteur `rene-website`, l’audience `rene-website-web` et une expiration de 15 minutes par défaut. La clé `JWT_SECRET` reste obligatoire et doit être générée comme décrit dans la documentation d’environnement.

## Validation côté serveur

Chaque requête authentifiée recharge la session et l’utilisateur. Le backend vérifie :

- que la session existe, n’est pas révoquée et n’a pas dépassé son expiration absolue ;
- que l’utilisateur existe toujours ;
- que l’identifiant utilisateur et la version de session concordent entre le JWT, la session et le compte ;
- que le rôle courant provient de la base de données, jamais des claims seuls.

Une modification administrative du compte incrémente `sessionVersion` et révoque toutes les sessions. La suppression du compte supprime les sessions en cascade. Une réinitialisation de mot de passe incrémente également la version et révoque toutes les sessions.

## Rotation, expiration et révocation

Le refresh token n’est stocké en base que sous forme de condensat SHA-256. À chaque appel de `POST /api/auth/refresh`, il est remplacé et l’ancien enregistrement est révoqué. La présentation ultérieure d’un token déjà utilisé est considérée comme une réutilisation frauduleuse et révoque toute sa famille.

Une famille expire après 8 heures, sans prolongation lors des rotations. Une inactivité de 30 minutes rend aussi le refresh token inutilisable. `POST /api/auth/logout` révoque la famille côté serveur puis efface les trois cookies.

## Protection CSRF et vol de session

Toute requête non sûre qui présente un cookie d’accès ou de refresh doit recopier `rene_csrf` dans l’en-tête `X-CSRF-Token`. La comparaison est effectuée en temps constant. `SameSite=Strict` ajoute une barrière supplémentaire.

Les tests couvrent notamment :

- la rotation normale et la réutilisation d’un ancien refresh token ;
- l’expiration absolue et l’expiration par inactivité ;
- la révocation après changement de version, suppression et logout ;
- le refus d’une requête mutante sans preuve CSRF ou avec une preuve volée ;
- l’absence de credentials dans Web Storage ;
- les contraintes `issuer`, `audience` et algorithme du JWT.
