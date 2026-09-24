# rene-website

Monorepo for the Rene Website platform.

## Scripts

- `npm run dev` (workspaces)
- `npm run lint`
- `npm run test`
- `npm run build`

## Prisma (backend)

- `npm run prisma:generate -w backend`
- `npm run prisma:migrate -w backend`
- `npm run prisma:seed -w backend`

Le seed supprime les données existantes. Il est refusé sauf si `NODE_ENV` vaut
`development` ou `test` **et** si `ALLOW_DESTRUCTIVE_SEED=true` est fourni explicitement.

## Comptes utilisateurs de seed (dev)

Les comptes suivants sont créés par le seed Prisma (utilisation locale uniquement) :

- Rédacteur: email `editor@rene-website.local` / mot de passe `editor-rene-2026`
- Modérateur: email `moderator@rene-website.local` / mot de passe `moderator-rene-2026`
- Administrateur: email `admin@rene-website.local` / mot de passe `admin-rene-2026`

## Relance de modération (J+3)

Si un événement (ou une révision d'événement publié) reste en attente de modération plus de 3 jours, un email de relance est envoyé à tous les modérateurs/administrateurs (une seule fois, indépendamment des abonnements par catégorie). Cette vérification n'est pas planifiée automatiquement par l'application : elle doit être déclenchée périodiquement (ex: toutes les heures) par un cron externe qui appelle :

```bash
curl -X POST https://<host>/api/moderation-reminders/check \
  -H "x-cron-secret: $CRON_SECRET"
```

`CRON_SECRET` doit être défini dans l'environnement du backend et fourni dans l'en-tête `x-cron-secret` de la requête.

## Déploiement sécurisé

La configuration de production, la création des secrets Docker et les procédures de
rotation sont décrites dans [docs/security-secrets.md](docs/security-secrets.md).

Les quotas, tailles de requêtes, délais sortants et la configuration sûre derrière un
reverse proxy sont décrits dans [docs/security-resource-limits.md](docs/security-resource-limits.md).

La politique CSP, les headers HTTP et le déploiement HTTPS sont décrits dans
[docs/security-http-headers.md](docs/security-http-headers.md).

Le durcissement des conteneurs, la configuration du reverse proxy et la vérification
des artefacts Photon sont documentés dans [docs/security-containers.md](docs/security-containers.md).

Les scans CI/CD, les seuils bloquants et la procédure de triage sont décrits dans
[docs/security-ci-triage.md](docs/security-ci-triage.md).
