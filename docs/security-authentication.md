# Politique d’authentification

## Création et activation des comptes

Les deux parcours sont disponibles :

- L’inscription publique crée uniquement un compte `EDITOR` inactif. Un lien à usage unique, valable 24 heures, est envoyé à l’adresse indiquée. Aucun cookie de session n’est créé avant la vérification de ce lien.
- Un administrateur peut créer un compte avec le rôle nécessaire depuis le backoffice. L’invitation existante invite son destinataire à définir son mot de passe ; cette action prouve la réception de l’email et active le compte. Le lien expire après 30 minutes.

Les réponses de l’inscription restent volontairement neutres pour les adresses déjà utilisées. Les adresses sont normalisées (Unicode NFKC, domaine et partie locale en minuscules) et la base impose l’unicité insensible à la casse.

## Mots de passe

- de 15 à 128 caractères Unicode, sans règle de composition qui pénaliserait les phrases de passe ;
- hash Argon2id avec `m=19456 KiB`, `t=2`, `p=1`, conformément au minimum OWASP ;
- les hashes SHA-256 historiques sont migrés vers Argon2id lors de la prochaine connexion réussie ;
- la longueur est contrôlée avant l’opération coûteuse.

Sur le poste de développement de référence, un hash a été mesuré à environ 30 ms. Cette mesure doit être rejouée au déploiement : le coût retenu doit rester sous une seconde sur l’infrastructure cible.

## Anti-abus et non-énumération

Les compteurs sont persistés dans PostgreSQL, avec verrou advisory transactionnel : plusieurs réplicas appliquent donc la même limite. Les clés stockées ne contiennent pas l’IP ou l’email en clair, seulement leur SHA-256.

| Parcours | IP | Compte / jeton |
| --- | --- | --- |
| Connexion | 20 / 15 min | 5 / 15 min |
| Inscription | 3 / heure | — |
| Mot de passe oublié | 5 / 15 min | 3 / 15 min |
| Réinitialisation / vérification | 10 / 15 min | 5 / 15 min |

Après le dépassement, le délai temporaire commence à 5 secondes et double dans la fenêtre, avec un plafond de 15 minutes. Une connexion réussie efface le compteur associé au compte. Les réponses de connexion et de récupération sont génériques, et les deux branches exécutent une opération Argon2id ainsi qu’un délai plancher afin de réduire les écarts observables.

## MFA

L’authentification multifacteur est à planifier pour les rôles `ADMIN`, puis proposée aux `MODERATOR`. Elle est suivie par l’issue #73 consacrée au cycle de vie des comptes privilégiés : son déploiement devra inclure des facteurs de récupération et une procédure d’administration sans contournement par email seul.
