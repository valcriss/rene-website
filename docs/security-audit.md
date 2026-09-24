# Journalisation de sécurité et audit métier

## Ce qui est enregistré

Chaque réponse HTTP API produit une ligne JSON contenant uniquement l'identifiant de
requête, la méthode, la route Express normalisée, le statut, la durée et, si la
requête est authentifiée, une empreinte SHA-256 tronquée de l'acteur. Ni la query
string, ni le corps, ni une adresse, un email, un mot de passe, un jeton ou une
erreur brute ne sont journalisés.

Les opérations sensibles créent aussi une entrée `AuditLog` horodatée en UTC :
connexions réussies ou refusées, création/suppression/modification d'utilisateur ou
de rôle, modification des réglages, ainsi que soumission, publication, refus,
archivage et suppression d'événements. Une entrée contient l'acteur, la cible,
l'action et son résultat ; les métadonnées sont limitées à une liste explicite de
valeurs non sensibles.

Les événements conservent également le modérateur et la date UTC de leur dernière
publication ou de leur dernier refus. Ces champs, comme l'audit, ne sont jamais
renvoyés par l'API publique.

## Intégrité, accès et conservation

La migration protège `AuditLog` par un trigger PostgreSQL qui refuse tout `UPDATE`
ou `DELETE`. Le rôle applicatif peut uniquement écrire et lire les tables nécessaires
à l'application ; seul le rôle de migration, distinct et réservé au déploiement,
peut modifier le schéma ou ce trigger. Il n'existe pas d'endpoint public de lecture
des audits.

Un rôle PostgreSQL de consultation dédié, en lecture seule, doit être accordé aux
seules personnes chargées des incidents. Exporter les éléments nécessaires à un
incident avec ce rôle, chiffrer l'export et tracer son détenteur. Conserver les
entrées pendant 180 jours au minimum, puis les exporter vers l'archivage approuvé
avant une purge réalisée par le rôle de migration ; ne jamais désactiver le trigger
pour cette opération.

## Alertes et réponse à incident

Le collecteur de logs doit émettre une alerte sur :

- toute action `admin.user.role.update` ;
- cinq échecs `auth.login` sur une même empreinte de requête ou adresse réseau en
  quinze minutes ;
- toute opération d'administration en dehors des créneaux habituels.

En cas d'alerte, relever l'identifiant de requête, consulter les lignes JSON et
`AuditLog` avec le rôle dédié, limiter ou invalider les sessions concernées, puis
consigner la chronologie et la décision. La procédure de rotation des secrets reste
décrite dans [security-secrets.md](security-secrets.md). Les valeurs sensibles ne
doivent jamais être copiées dans le ticket d'incident.
