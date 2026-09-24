# Politique de sécurité des dépendances

## Contrôles automatisés

La CI et la publication exécutent `npm run audit:security`. La commande échoue dès qu'une
vulnérabilité de sévérité `high` ou `critical` est signalée dans l'arbre npm complet, dépendances
de développement comprises.

La CI construit ensuite l'image de production et l'analyse avec Trivy. Le pipeline échoue pour
toute vulnérabilité `HIGH` ou `CRITICAL`, corrigée ou non, détectée dans les paquets du système ou
les bibliothèques applicatives. Il n'existe aucune exclusion globale ni aucun fichier d'ignorance.

## Périmètre de l'image de production

Le build multi-étapes sépare les outils de compilation du runtime. L'image finale contient
uniquement les dépendances de production du workspace backend, le client Prisma généré, le backend
compilé et les fichiers statiques du frontend. Vite, Vitest, Jest, TypeScript, Tiptap et les
dépendances de construction du frontend ne sont pas copiés dans l'image finale.

Prisma déclare TypeScript comme dépendance pair optionnelle. npm l'installe malgré `--omit=dev` et
`--omit=peer` parce que le lockfile du monorepo contient aussi le compilateur pour le développement.
Le stage de dépendances le retire explicitement après la génération du client Prisma ; ni le client
généré ni les migrations JavaScript n'en ont besoin à l'exécution.

Le CLI Prisma reste une dépendance de production parce que le point d'entrée exécute les migrations
avant de démarrer l'API. Les paquets `prisma` et `@prisma/client` sont temporairement verrouillés sur
la version `6.12.0` : les versions ultérieures disponibles au 24 septembre 2026 réintroduisent une
dépendance vulnérable à `deepmerge-ts`. Les mainteneurs du projet doivent réévaluer ce verrouillage
au plus tard le 31 octobre 2026, ou dès la publication d'une version Prisma corrigée.

Le projet requiert Node.js `>=24.9.0` et utilise la branche LTS 24 dans la CI et les images Docker.

Le gestionnaire npm global de l'image Node n'est pas requis à l'exécution et est retiré du stage
final. Le point d'entrée appelle directement le CLI Prisma et le module d'import des communes avec
Node.js. npm reste disponible uniquement dans les stages de construction.

## Traitement d'une alerte

Une mise à niveau corrigée est la réponse par défaut. Si aucune correction n'existe, une exception
temporaire doit être documentée dans une issue SECURITY avec :

- l'identifiant de l'avis et les composants concernés ;
- une analyse d'exploitabilité dans ce projet ;
- les mesures compensatoires ;
- un responsable et une date limite explicite ;
- une exclusion ciblée et limitée dans le temps, jamais une désactivation globale du contrôle.

Il n'y a actuellement aucune vulnérabilité acceptée ni aucune exception de scan.
