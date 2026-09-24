# Secrets et configuration de production

Le service refuse de démarrer avec une configuration de production incomplète ou
faible. Les valeurs sensibles ne doivent être placées ni dans Git, ni dans une image,
ni directement dans `docker-compose.yml`.

## Variables obligatoires

Le déploiement fournit les valeurs non sensibles suivantes à Docker Compose :

- `POSTGRES_MIGRATION_USER` : rôle propriétaire utilisé uniquement par les migrations ;
- `POSTGRES_APP_USER` : rôle applicatif sans privilèges DDL ni administration ;
- `POSTGRES_DB` ;
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` et `SENDER_EMAIL` ;
- `SITE_URL` : URL absolue publique du site (`https://...`), utilisée pour les
  canonical, Open Graph et X Card générés côté serveur (issue #47).

Le backend valide en production :

- une `DATABASE_URL` PostgreSQL avec un rôle applicatif dédié et un mot de passe ;
- des secrets JWT et cron d'au moins 32 caractères avec une diversité suffisante,
  différents des valeurs faibles connues ;
- une URL Photon HTTP(S), une `SITE_URL` HTTP(S), un port valide et une
  configuration SMTP cohérente ;
- la présence et la lisibilité des fichiers référencés par les variables `*_FILE`.

Les erreurs de démarrage citent seulement le nom de la variable concernée. Elles ne
doivent jamais inclure la valeur d'un secret ni le contenu d'un fichier secret.

## Secrets Docker attendus

Le compose de production monte des fichiers de secrets conservés hors du dépôt. Leur
chemin est fourni par les variables de déploiement `DATABASE_URL_SECRET_FILE`,
`MIGRATION_DATABASE_URL_SECRET_FILE`, `JWT_SECRET_FILE`, `CRON_SECRET_FILE`,
`SMTP_PASSWORD_SECRET_FILE`, `POSTGRES_MIGRATION_PASSWORD_SECRET_FILE` et
`POSTGRES_APP_PASSWORD_SECRET_FILE` :

| Secret | Contenu |
| --- | --- |
| `database_url` | URL PostgreSQL du rôle applicatif |
| `migration_database_url` | URL PostgreSQL du rôle de migration |
| `jwt_secret` | secret aléatoire de signature JWT |
| `cron_secret` | secret aléatoire de l'appel de relance |
| `smtp_password` | mot de passe SMTP |
| `postgres_migration_password` | mot de passe du rôle de migration |
| `postgres_app_password` | mot de passe du rôle applicatif |

Générer les secrets aléatoires avec un générateur cryptographique (par exemple
`openssl rand -base64 48`) et créer leurs fichiers avec des permissions limitées au
compte de déploiement. Les URLs PostgreSQL
doivent encoder leurs composants conformément aux URLs et utiliser exactement les
mêmes identifiants que les secrets PostgreSQL correspondants. Les fichiers locaux
temporaires utilisés pour préparer un déploiement restent dans `secrets/`, répertoire
ignoré par Git, et sont supprimés dès leur import dans le gestionnaire de secrets.

Le script d'initialisation PostgreSQL crée le rôle applicatif avec `NOSUPERUSER`,
`NOCREATEDB`, `NOCREATEROLE` et `NOREPLICATION`. Il lui accorde uniquement la
connexion, l'usage du schéma, les opérations DML sur les tables et l'usage des
séquences. Les migrations s'exécutent avec le rôle séparé avant le démarrage de
l'application.

Sur un volume PostgreSQL existant, le script d'initialisation ne sera pas rejoué :
l'administrateur de la base doit créer le rôle applicatif et appliquer les mêmes
privilèges avant le premier déploiement de cette version.

## Checklist de déploiement

1. Créer deux rôles et mots de passe distincts pour les migrations et l'application,
   avec au moins 16 caractères pour le mot de passe applicatif.
2. Créer ou remplacer les sept fichiers de secrets listés ci-dessus, hors du dépôt.
3. Fournir les variables non sensibles requises sans utiliser un fichier `.env`
   versionné.
4. Vérifier que les URLs ne contiennent ni compte `postgres`/`root` côté application,
   ni mot de passe partagé entre rôles.
5. Exécuter `docker compose config` dans un environnement contrôlé et vérifier que la
   sortie ne contient aucune valeur secrète.
6. Déployer, vérifier la réussite des migrations, puis `/api/health`.
7. Tester l'envoi SMTP, l'appel cron et une connexion utilisateur.
8. Conserver les anciennes valeurs uniquement pendant la fenêtre de retour arrière,
   puis les révoquer.

Le seed Prisma est destructif. Il est autorisé uniquement avec `NODE_ENV=development`
ou `NODE_ENV=test` et `ALLOW_DESTRUCTIVE_SEED=true`. Il ne doit jamais être exécuté
sur une base de production.

## Rotation et urgence

Pour une rotation planifiée, créer d'abord une nouvelle valeur dans le gestionnaire,
mettre à jour le secret Docker, redéployer, valider le service, puis révoquer l'ancienne
valeur. Effectuer les rotations dans cet ordre : compte de migration, compte
applicatif, SMTP, cron, JWT.

La rotation du secret JWT invalide immédiatement toutes les sessions existantes :
prévoir une reconnexion des utilisateurs. La rotation du secret cron nécessite la
mise à jour coordonnée du planificateur. Pour PostgreSQL et SMTP, vérifier une
connexion avec la nouvelle valeur avant de supprimer l'ancienne.

En cas de fuite présumée :

1. suspendre le composant ou l'identifiant compromis ;
2. révoquer immédiatement la valeur exposée et en générer une nouvelle ;
3. redéployer sans inscrire la valeur dans les logs ou dans un ticket ;
4. invalider les sessions si le JWT est concerné ;
5. examiner les journaux d'accès et l'audit métier sur la période d'exposition ;
6. consigner l'incident, sa portée et les actions de remédiation sans recopier le secret.

Le job `secret-scan` de la CI analyse l'historique Git avec Gitleaks. Une détection ne
doit pas être neutralisée par une allowlist sans revue de sécurité et justification.
