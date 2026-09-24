# Limites de ressources et protections anti-abus

Les compteurs applicatifs sont enregistrés dans PostgreSQL (`AuthRateLimit`) et verrouillés par transaction. Ils sont donc partagés par les réplicas. Les clés ne contiennent jamais l'adresse IP ou l'identifiant d'un compte en clair : ils sont hachés en SHA-256.

| Action | Limite IP | Limite compte |
| --- | ---: | ---: |
| Mutation API générale | 120 / 15 min | 240 / 15 min |
| Upload | 30 / 15 min | 20 / 15 min |
| Contact | 5 / 15 min | — |
| Géocodage | 60 / 15 min | 120 / 15 min |

Les limites d'authentification sont documentées séparément dans [security-authentication.md](security-authentication.md). Toute réponse limitée est un `429` avec l'en-tête `Retry-After`.

## Proxy et adresses IP

Le conteneur est exposé directement par défaut et ne fait confiance à aucun en-tête `X-Forwarded-For`. Derrière un unique reverse proxy géré et sur un réseau privé, définir `TRUST_PROXY_HOPS=1` dans le service `rene`. Ne jamais définir cette valeur si le proxy n'écrase pas les en-têtes transmis par le client. La valeur est bornée de 0 à 3 ; une valeur invalide revient à 0.

Le reverse proxy doit aussi appliquer des limites de connexions et de débit avant d'atteindre Node.js. Les limites CPU, mémoire et PID du service dans `docker-compose.yml` bornent l'impact d'une requête coûteuse.

## Tailles et appels sortants

- JSON : 128 KiB ; upload : une image et taille contrôlée par Multer ;
- événements : 50 occurrences, 6 liens sociaux, URLs de 2 048 caractères au plus ;
- Photon : délai de 3 s par défaut (`PHOTON_TIMEOUT_MS`, borné entre 500 ms et 10 s) ;
- SMTP : délais connexion, accueil et socket de 10 s par défaut (`SMTP_TIMEOUT_MS`, borné entre 1 s et 60 s).

Les délais et les quotas peuvent être réglés uniquement dans leurs bornes de sécurité. En cas de Photon indisponible, l'API retourne une erreur générique sans bloquer le processus. Les notifications asynchrones signalent leur échec sans modifier les réponses neutres des parcours d'authentification.
