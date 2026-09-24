# Sécurité des images téléversées

## Accès et limites

- `POST /api/uploads` exige un JWT valide avec un rôle `EDITOR`, `MODERATOR` ou `ADMIN`.
- L’authentification et le quota sont vérifiés avant le parsing multipart.
- Le champ attendu est `image`, avec exactement un fichier et aucun autre champ multipart.
- Taille maximale : **5 Mio**.
- Résolution maximale décodée : **20 mégapixels**.
- Quota local : **20 tentatives par utilisateur et par fenêtre de 15 minutes**.

## Formats acceptés

Seuls JPEG (`.jpg` ou `.jpeg`), PNG (`.png`) et WebP (`.webp`) sont acceptés. Le nom
doit avoir une extension unique cohérente avec le MIME déclaré. SVG, formats actifs,
doubles extensions et incohérences MIME/extension sont refusés.

Le serveur ne fait pas confiance à cette déclaration : il contrôle aussi l’enveloppe binaire,
refuse les données ajoutées après la fin du fichier, décode l’image avec une limite de pixels,
puis la réencode systématiquement en WebP. Ce réencodage supprime les métadonnées EXIF/XMP,
les profils annexes et tout contenu non nécessaire à l’affichage.

## Stockage et cycle de vie

`UPLOAD_DIR` désigne une racine de stockage hors du build frontend :

- `pending/` contient les images validées mais pas encore rattachées à un événement ;
- `assets/` contient les images réclamées lors de la sauvegarde d’un événement.

Les fichiers temporaires de plus de **24 heures** sont supprimés lors du traitement d’un nouvel
upload valide. Une sauvegarde d’événement promeut atomiquement les images référencées dans le
champ principal ou le contenu riche. En cas d’échec de sauvegarde, elles retournent dans la zone
temporaire. Le remplacement ou la suppression d’un événement supprime toujours son ancien fichier.

## Service HTTP

Les images ne sont pas exposées par `express.static`. `GET /uploads/:filename` n’accepte que les
noms WebP générés par le serveur, lit uniquement dans les deux répertoires contrôlés et répond avec
`Content-Type: image/webp`, `X-Content-Type-Options: nosniff`, une CSP restrictive et une politique
de cache immuable. Les erreurs envoyées au client ne contiennent jamais de chemin système.

Les refus sont journalisés avec l’identifiant de l’acteur et un code de motif, sans nom de fichier
fourni par le client.
