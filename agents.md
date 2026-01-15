# AGENTS.md

## 1. Présentation du projet

**rene-website** est une plateforme web destinée à promouvoir les événements culturels autour de Descartes (Indre-et-Loire) et des communes environnantes.

Le site permet :
- aux **visiteurs** de consulter un agenda culturel filtrable (dates, catégories, zone géographique) avec une **vue liste + carte**,
- aux **rédacteurs** de créer et modifier leurs événements,
- aux **modérateurs** de publier ou refuser les événements,
- aux **administrateurs** de gérer l’ensemble du logiciel (utilisateurs, rôles, catégories, réglages).

Le projet est conçu pour être **dockerisable**, **maintenable**, et **développé avec des standards professionnels stricts** (linting, tests, CI/CD, couverture 100 %).

Ce document sert de **référence unique** pour tout agent IA autonome participant au développement du projet.

---

## 2. Stack technique

### Frontend
- Vue.js 3 (Vite)
- Tailwind CSS (exclusif pour le style, CSS classique uniquement si impossible autrement)
- Vitest pour les tests
- Couverture de code : **100 % lignes, branches, fonctions, statements**

### Backend
- Node.js (TypeScript)
- Framework léger (Express ou NestJS selon implémentation courante du repo)
- Jest pour les tests
- Couverture de code : **100 % lignes, branches, fonctions, statements**

### Base de données
- PostgreSQL
- Migrations versionnées

### Infrastructure
- Monorepo GitHub
- Docker & Docker Compose
- GitHub Actions pour CI/CD
- Registry Docker : GitHub Container Registry (GHCR)

---

## 3. Structure du dépôt

```
/
├─ backend/          # API, logique métier, accès BDD
├─ frontend/         # Application Vue
├─ .github/workflows # CI/CD
├─ Dockerfile        # Build production (frontend + backend)
├─ docker-compose.dev.yml
├─ docker-compose.yml
├─ package.json      # Workspaces + scripts globaux
└─ AGENTS.md
```

Le backend et le frontend **partagent le même dépôt** et sont orchestrés via des workspaces npm.

---

## 4. Architecture générale

### Vue d’ensemble

- Le **backend** expose une API REST `/api/*`
- Le **frontend** est buildé en statique et servi par le backend en production
- Une **seule image Docker** est produite pour la production

### Environnements

- **Développement** :
  - frontend (Vite) et backend lancés localement
  - PostgreSQL via `docker-compose.dev.yml`

- **Production** :
  - image `ghcr.io/valcriss/rene-website:latest`
  - PostgreSQL via `docker-compose.yml`

---

## 5. Modèle fonctionnel : Événements

Un événement (appelé parfois "article") représente une annonce culturelle.

### Champs validés V1

**Contenu**
- title
- content
- image

**Catégorisation**
- categoryId (cinéma, lecture, théâtre, etc.)

**Temps**
- eventStartAt
- eventEndAt
- allDay (bool)

**Lieu**
- venueName
- address (optionnel)
- postalCode
- city
- latitude
- longitude

**Publication**
- status: DRAFT | PENDING | PUBLISHED | REJECTED
- publishedAt
- publicationEndAt (par défaut = eventEndAt)
- rejectionReason (si refus)

**Organisateur**
- organizerName
- organizerUrl (optionnel)
- contactEmail (optionnel)
- contactPhone (optionnel)
- ticketUrl / websiteUrl

**Traçabilité (backend uniquement)**
- createdByUserId
- createdAt
- updatedAt
- publishedByUserId
- rejectedByUserId
- rejectedAt

---

## 6. Rôles et permissions (RBAC)

### Rédacteur
- Créer un événement
- Modifier ses propres événements
- Soumettre un événement à la modération

### Modérateur
- Créer un événement
- Modifier ses propres événements
- Publier les événements
- Refuser les événements (avec motif)

### Administrateur
- Tous les droits
- Gestion des utilisateurs et rôles
- Gestion des catégories et réglages
- Maintenance et gouvernance du logiciel

La sécurité **doit toujours être appliquée côté backend**. Le frontend ne fait qu’adapter l’affichage.

---

## 7. Frontend : principes UX/UI

Le frontend visiteurs est conçu comme un **agenda culturel visuel**.

### Principes clés
- Mobile-first
- Importance donnée à l’image (affiches, visuels)
- Style clair, moderne, orienté spectacle
- Aucune surcharge informationnelle

### Pages principales
- Agenda : filtres + liste + carte (Leaflet)
- Vue carte synchronisée avec la liste
- Détail événement : informations complètes + mini-carte + actions (itinéraire, calendrier)
- Page "Ce week-end" (agenda pré-filtré)

---

## 8. Qualité de code (non négociable)

### Linting
- ESLint obligatoire (frontend + backend)
- Aucun warning toléré en CI

### Tests
- Tests unitaires obligatoires
- Couverture exigée :
  - 100 % lignes
  - 100 % branches
  - 100 % fonctions
  - 100 % statements

Toute baisse de couverture **doit faire échouer la CI**.

### Lisibilité
- Code explicite
- Pas de logique cachée
- Fonctions courtes et testables

---

## 9. CI/CD

### CI (à chaque commit / PR)
- Installation des dépendances
- Lint
- Tests (avec couverture)
- Build frontend + backend

### Release (sur tag `vX.Y.Z`)
- Lint
- Tests
- Build
- Build image Docker
- Push vers :
  - `ghcr.io/valcriss/rene-website:latest`
  - `ghcr.io/valcriss/rene-website:vX.Y.Z`

---

## 10. Contraintes pour un Agent IA autonome

Un agent IA intervenant sur ce projet doit :
- respecter strictement ce document
- ne jamais introduire de dette technique volontaire
- ne jamais contourner la couverture 100 % (pas de `/* istanbul ignore */` abusif)
- proposer des évolutions compatibles V1 (pas de features V2 non demandées)
- privilégier la simplicité, la clarté et la testabilité

Toute décision structurante (nouvelle dépendance, changement d’architecture, nouveau service) doit être **explicitement justifiée**.

---

**AGENTS.md est la source de vérité pour le développement de rene-website.**

