# Sauvegarde, restauration et reprise

## Objectifs de reprise

La cible de production est un RPO de 24 heures et un RTO de 4 heures pour PostgreSQL
et les uploads ensemble. Une sauvegarde est lancée chaque nuit à 02:15 UTC, surveillée
par le planificateur : toute absence de manifeste récent de moins de 26 heures ou tout
code de sortie non nul alerte l’astreinte. Les responsabilités sont : exploitation
(exécution et alerte), référent sécurité (clés et accès), responsable produit
(décision de reprise).

## Exécution isolée

Les scripts [backup.sh](../scripts/backup.sh) et
[restore-verify.sh](../scripts/restore-verify.sh) s’exécutent sur un hôte de
sauvegarde distinct, jamais dans `rene` ni dans le réseau du conteneur applicatif.
L’hôte utilise un compte PostgreSQL de sauvegarde dédié, limité à `CONNECT` et
`SELECT`, ainsi qu’une clé `age` publique pour chiffrer chaque dump et archive.
Les clés privées et `BACKUP_DATABASE_URL_FILE` sont conservés dans le gestionnaire de
secrets de l’hôte de sauvegarde ; aucun de ces fichiers n’est monté dans l’application.

`BACKUP_UPLOADS_DIR` est un montage en lecture seule du stockage média réservé au
runner de sauvegarde. `BACKUP_DIR` est un stockage chiffré, versionné, hors du serveur
applicatif et localisé conformément aux exigences applicables. La rétention est de 35
sauvegardes quotidiennes, 12 mensuelles et 7 annuelles ; une suppression suit la
politique de conservation approuvée.

Exemple de tâche planifiée hôte :

```cron
15 2 * * * /opt/rene/scripts/backup.sh
```

Le script produit deux flux `age` et `SHA256SUMS`, sans fichier clair durable. Le
planificateur doit transmettre son code de sortie et contrôler le manifeste.

## Test de restauration mensuel

Chaque premier mardi du mois, restaurer la dernière sauvegarde dans une base, un
répertoire d’uploads et un réseau **isolés**. La commande exige explicitement
`RESTORE_TARGET_CONFIRM=isolated`, vérifie les checksums avant déchiffrement, puis
restaure la base et les médias. Chronométrer l’opération et vérifier `/api/health`,
un événement public avec image et un compte de test. Consigner durée, RPO observé,
version de sauvegarde et anomalies dans le registre d’exploitation.

Ne jamais exécuter `restore-verify.sh` contre la production : `pg_restore --clean`
est volontairement destructif et le garde-fou ne remplace pas l’isolement réseau.

## Incident et reconstruction

En cas de perte ou compromission : isoler l’application, révoquer les secrets et
sessions concernés, déployer l’image attestée, appliquer les migrations avec le rôle
dédié, puis restaurer la dernière sauvegarde validée dans un environnement isolé.
Après validation, basculer selon la procédure de changement et renouveler les clés de
sauvegarde. La procédure générale de rotation reste dans
[security-secrets.md](security-secrets.md).
