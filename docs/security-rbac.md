# Matrice d’autorisation (RBAC et propriété)

Les décisions d’autorisation sont prises par le backend à partir de l’acteur authentifié
(`id` et `role`). Le rôle transmis par le frontend n’est jamais une source de confiance.

| Action | EDITOR | MODERATOR | ADMIN |
| --- | --- | --- | --- |
| Créer un événement | Oui, comme propriétaire | Oui, comme propriétaire | Oui |
| Lire un brouillon ou un refus | Ses événements | Ses événements | Tous |
| Lire un événement en attente | Ses événements | Tous les événements à modérer | Tous |
| Lire un événement publié | Oui | Oui | Oui |
| Modifier / soumettre | Ses événements | Ses événements | Tous |
| Supprimer | Ses brouillons | Ses brouillons | Tous |
| Publier / refuser | Non | Tous les événements en attente | Tous |
| Mettre en avant / archiver | Non | Non | Tous les événements publiés |
| Gérer ses abonnements | Ses abonnements | Ses abonnements | Ses abonnements |

## Règles d’accès objet

- Chaque mutation reçoit un acteur typé et vérifie le rôle, la propriété, l’état courant et
  la transition demandée dans le service métier.
- Un utilisateur non administrateur qui vise un identifiant absent ou un événement privé
  appartenant à un autre rédacteur reçoit la même réponse générique `403 Action non autorisée`.
  Cette règle évite de révéler l’existence d’un objet privé.
- Un administrateur reçoit `404 Événement introuvable` pour un identifiant réellement absent.
- Les listes authentifiées sont filtrées avant sérialisation : un rédacteur ne voit que ses
  événements et les publications ; un modérateur voit en plus la file de modération ; un
  administrateur voit l’ensemble.
- Les contrôles de l’interface ne servent qu’à masquer les actions indisponibles. Ils ne
  remplacent jamais les contrôles du backend.

Les réponses publiques et leur DTO minimal font l’objet de l’issue #45 ; la présente matrice
décrit les accès authentifiés du back-office.
