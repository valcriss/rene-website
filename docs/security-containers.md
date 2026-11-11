# Conteneurs et artefacts Photon

L’image applicative est construite avec des bases épinglées par digest, puis exécutée avec l’UID/GID `10001`. Le runtime ne contient que les dépendances de production ; npm, npx, TypeScript et les sources de build n’y sont pas copiés.

Le service `rene` utilise un système de fichiers en lecture seule. Seuls le volume `/app/uploads` et le tmpfs borné `/tmp` peuvent recevoir des écritures. Il supprime toutes les capabilities Linux, interdit l’élévation de privilèges, limite CPU, mémoire et PID, et expose un healthcheck HTTP. Le port applicatif est lié à `127.0.0.1` : un reverse proxy TLS doit être le seul composant exposé publiquement.

Photon s’exécute avec l’image `rtuszik/photon-docker`, épinglée par version **et** par digest dans les fichiers Compose, sous l’UID/GID `9011` (utilisateur `photon` de l’image) avec un système de fichiers en lecture seule, toutes les capabilities supprimées et `no-new-privileges`. Seuls le volume `/photon/data` et le tmpfs `/tmp` sont inscriptibles. L’image fournit son propre healthcheck HTTP (`/status`).

## Configurer Photon

Le service est configuré par trois variables d’environnement, toutes optionnelles :

```dotenv
PHOTON_REGION=france          # région de l’index prébuilt (mode db : une seule région)
PHOTON_UPDATE_INTERVAL=720h   # âge minimal de l’index avant de chercher une mise à jour
PHOTON_PORT=2322              # dev uniquement : port publié sur l’hôte
```

`UPDATE_STRATEGY=PARALLEL` est fixé dans Compose : le nouvel index est téléchargé en arrière-plan puis substitué à l’ancien, sans interruption du service. Il faut donc prévoir **deux fois** la taille de l’index en espace disque (environ 5 Go téléchargés, 8 Go extraits pour la France).

## Compromis de sécurité

Contrairement à l’ancien `photon-init`, l’image ne vérifie pas de SHA-256 épinglé : l’index est téléchargé depuis un miroir communautaire (`r2.koalasec.org`) et seul un MD5 publié par ce miroir est contrôlé. Les mises à jour automatiques acceptent donc un index qui change sans relecture. Photon n’est utilisé que pour géocoder des adresses d’événements (lecture seule, aucune donnée utilisateur envoyée), et le service reste isolé sur le réseau Compose ; ce risque a été jugé acceptable en échange de mises à jour automatiques. Pour revenir à un contrôle strict, passer `UPDATE_STRATEGY` à `DISABLED`.

## Migration depuis `photon-init`

Le volume `photon-data` de l’ancienne configuration (jar + index) n’est plus utilisé : la production utilise `photon-data-v2` et le développement un volume nommé `photon-data` au lieu du dossier `./photon`. Après validation, supprimer l’ancien volume (`docker volume rm <projet>_photon-data`) et le dossier `./photon` local. Le premier démarrage télécharge l’index (quelques minutes) ; `rene` attend le healthcheck de `photon`.

## Mettre à jour les bases

Dependabot ouvre chaque semaine une PR pour les bases du `Dockerfile`. À chaque mise à jour, récupérer le digest multi-architecture avec `docker buildx imagetools inspect <image:tag>`, mettre à jour les références épinglées de `Dockerfile` et des fichiers Compose, puis laisser la CI exécuter le build et le scan Trivy. Une release produit également un SBOM et une attestation de provenance dans GHCR.
