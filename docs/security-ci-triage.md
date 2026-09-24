# Contrôles CI/CD et triage sécurité

Chaque pull request exécute une installation déterministe (`npm ci`), le scan historique Gitleaks, la revue des dépendances, Trivy (fichiers, secrets, configuration et image finale) et CodeQL pour JavaScript/TypeScript. Les rapports Trivy sont publiés en SARIF dans GitHub Code Scanning et conservés comme artefact privé quatorze jours ; aucun secret détecté n’est imprimé par les étapes CI.

La revue de dépendances bloque toute vulnérabilité `high` ou `critical`, quel que soit le scope. Trivy bloque aussi ces deux sévérités dans le dépôt et l’image. L’image de release reçoit un SBOM et une provenance BuildKit attachés à son image GHCR.

L’action GitHub Dependency Review exige que le **Dependency graph** soit activé dans les réglages « Advanced Security » du dépôt. Tant que ce réglage GitHub externe est désactivé, elle émet un avertissement et le `npm audit --audit-level=high` déterministe reste le contrôle bloquant de remplacement. L’activer remet immédiatement en service la revue GitHub native avec le même seuil.

## Triage et délais

| Sévérité | Délai de prise en charge | Délai de correction cible |
| --- | --- | --- |
| Critique | immédiat, au plus tard 4 h | 24 h |
| Élevée | 1 jour ouvré | 7 jours |
| Moyenne | 5 jours ouvrés | 30 jours |
| Faible | 10 jours ouvrés | prochain cycle planifié |

Un résultat est d’abord reproduit et classé par l’équipe responsable. Une correction inclut un test de non-régression quand elle touche le code applicatif. Les alertes de dépendances sans correctif restent ouvertes et sont réévaluées à chaque exécution planifiée.

## Exception temporaire

Une exception ne peut pas être masquée dans le workflow. Elle doit être ouverte dans une issue `SECURITY`, avec le CVE ou l’alerte concernée, la justification, les mesures compensatoires, un responsable, une date d’expiration et l’approbation explicite d’un administrateur du dépôt. À l’expiration, le scan redevient bloquant ; toute prolongation nécessite une nouvelle approbation documentée.

Les protections de branche de `main` exigent les contrôles `secret-scan`, `build-test`, `dependency-review`, `filesystem-scan` et `codeql` avant fusion.
