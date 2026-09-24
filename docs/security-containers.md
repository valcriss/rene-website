# Conteneurs et artefacts Photon

L’image applicative est construite avec des bases épinglées par digest, puis exécutée avec l’UID/GID `10001`. Le runtime ne contient que les dépendances de production ; npm, npx, TypeScript et les sources de build n’y sont pas copiés.

Le service `rene` utilise un système de fichiers en lecture seule. Seuls le volume `/app/uploads` et le tmpfs borné `/tmp` peuvent recevoir des écritures. Il supprime toutes les capabilities Linux, interdit l’élévation de privilèges, limite CPU, mémoire et PID, et expose un healthcheck HTTP. Le port applicatif est lié à `127.0.0.1` : un reverse proxy TLS doit être le seul composant exposé publiquement.

Photon s’exécute sous l’UID/GID `65532`. Son initialisation valide les checksums SHA-256 du JAR et du dump avant toute utilisation. Le téléchargement est d’abord écrit dans un fichier, validé, testé comme archive, puis extrait dans un répertoire de préparation : il n’existe plus de pipe direct réseau-vers-extracteur.

## Configurer Photon

Les quatre variables suivantes sont obligatoires pour chaque mise à jour de Photon :

```dotenv
PHOTON_JAR_URL=https://github.com/komoot/photon/releases/download/0.7.4/photon-opensearch-0.7.4.jar
PHOTON_JAR_SHA256=b55848b59dc8940bdc64f7d8e421359e986fa4b63276180922fd75d5c0ca758f
PHOTON_DB_URL=https://…/photon-db-fr-250720.tar.bz2
PHOTON_DB_SHA256=<digest de 64 caractères vérifié hors bande>
```

La valeur du dump doit provenir d’une source de confiance indépendante du téléchargement lui-même. Si le fournisseur ne publie pas de digest, l’exploitant doit l’obtenir dans son processus de validation interne avant de le placer dans le secret ou l’environnement de déploiement. Une valeur manquante ou incorrecte arrête `photon-init` sans modifier l’index actif.

## Mettre à jour les bases

Dependabot ouvre chaque semaine une PR pour les bases du `Dockerfile`. À chaque mise à jour, récupérer le digest multi-architecture avec `docker buildx imagetools inspect <image:tag>`, mettre à jour les références épinglées de `Dockerfile` et des fichiers Compose, puis laisser la CI exécuter le build et le scan Trivy. Une release produit également un SBOM et une attestation de provenance dans GHCR.
