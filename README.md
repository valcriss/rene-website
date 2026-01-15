# rene-website

Monorepo for the Rene Website platform.

## Scripts

- `npm run dev` (workspaces)
- `npm run lint`
- `npm run test`
- `npm run build`

## Prisma (backend)

- `npm run prisma:generate -w backend`
- `npm run prisma:migrate -w backend`
- `npm run prisma:seed -w backend`

## Comptes utilisateurs de seed (dev)

Les comptes suivants sont créés par le seed Prisma (utilisation locale uniquement) :

- Rédacteur: email `editor@rene-website.local` / mot de passe `editor-rene-2026`
- Modérateur: email `moderator@rene-website.local` / mot de passe `moderator-rene-2026`
- Administrateur: email `admin@rene-website.local` / mot de passe `admin-rene-2026`
