# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**rene-website** is a platform promoting cultural events around Descartes (Indre-et-Loire, France). Visitors browse a filterable event agenda (list + map view); editors create events; moderators publish/reject them; admins manage users, roles, categories and settings. See [agents.md](agents.md) for the full functional/domain spec (French) — it is the source of truth for business rules, RBAC, and the event data model.

npm workspaces monorepo: `backend` (Node/TypeScript/Express/Prisma/PostgreSQL) + `frontend` (Vue 3/Vite/Tailwind). In production the frontend is built to static assets and served by the backend from a single Docker image (`registerStatic` in [backend/src/static.ts](backend/src/static.ts), gated on `NODE_ENV=production`).

## Commands

Run from repo root (workspaces) or with `-w backend` / `-w frontend`:

```bash
npm run dev          # runs backend dev then frontend dev (see note below)
npm run lint         # backend + frontend
npm run test         # backend (jest --coverage) + frontend (vitest run --coverage)
npm run build        # backend (tsc) + frontend (vite build)
```

Note: the root `dev` script runs backend and frontend sequentially with `&&`, so in practice run them in two terminals: `npm run dev -w backend` and `npm run dev -w frontend`.

Single test / watch mode — run inside the relevant workspace:

```bash
# backend (jest)
npx jest tests/events.service.test.ts
npx jest -t "test name substring"

# frontend (vitest)
npx vitest run tests/eventsStore.test.ts
npx vitest tests/eventsStore.test.ts   # watch mode
```

Prisma (backend, from `backend/` or with `-w backend`):

```bash
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run prisma:seed -w backend
```

Local Postgres + Photon (geocoding) for dev: `docker-compose.dev.yml` (services: `db`, `photon`, `photon-init`).

## Code quality bar (non-negotiable, see agents.md §8)

- **Coverage thresholds are enforced and fail the test command on any drop** — lines, branches, functions, statements. Backend: 100% (`backend/jest.config.cjs`, `coverageThreshold.global`). Frontend: 80% (`frontend/vite.config.ts`, `coverage.thresholds`). Don't add `/* istanbul ignore */` to dodge this — write the test.
- ESLint must be clean (no warnings tolerated in CI) on both workspaces.
- Security/authorization must always be enforced backend-side; the frontend only adapts what it displays based on role.
- Don't introduce V2 features unless explicitly asked — keep changes scoped to what's requested, favor simplicity/testability over abstraction.

## Backend architecture (`backend/src/`)

Feature modules, one directory per domain: `auth/`, `events/`, `categories/`, `audiences/`, `admin/`, `geocoding/`, `uploads/`, `notifications/`. [backend/src/app.ts](backend/src/app.ts) wires them all into the Express app.

Each data-backed module follows the same repository pattern — when adding a module or changing data access, follow it:

- `types.ts` — domain types
- `repository.ts` — interface (e.g. `EventRepository`)
- `inMemoryRepository.ts` — in-memory implementation, used automatically when `NODE_ENV=test`
- `prismaRepository.ts` — Postgres implementation via Prisma, lazily `require`d only when needed (keeps Prisma out of the test bundle)
- `repositoryFactory.ts` — picks the implementation: in-memory for tests, Prisma when `DATABASE_URL` is set, else falls back to in-memory with a console warning
- `service.ts` — business logic, takes a repository via dependency injection
- `validation.ts` — request payload validation
- `routes.ts` — Express router, wires validation → service → repository
- `sanitize.ts` (events) — HTML sanitization for rich-text content (`sanitize-html`)

Tests live in `backend/tests/`, mirroring `src/` module names (e.g. `events.service.test.ts`, `events.validation.test.ts`), not colocated with source.

Auth: JWT-based (`auth/jwt.ts`), roles are `EDITOR | MODERATOR | ADMIN` (`auth/roles.ts`). `requireRole([...])` middleware checks `req.user?.role` (set by `authenticateOptional` from the JWT) with a fallback to an `x-user-role` header — the header path exists for testing/local convenience, real authorization always goes through the JWT-derived role.

Prisma schema/migrations: `backend/prisma/schema.prisma`, `backend/prisma/migrations/`. Seed script (`backend/prisma/seed.ts`) creates dev accounts documented in [README.md](README.md).

## Frontend architecture (`frontend/src/`)

Vue 3 + Vite + Tailwind (Tailwind is the only styling approach; plain CSS only when Tailwind genuinely can't do it — see agents.md §7). Pinia for state, vue-router for routing, vue-i18n for translations ([frontend/src/i18n/messages.ts](frontend/src/i18n/messages.ts)).

- `pages/` — routed page components; `pages/backoffice/` — editor/moderator/admin-facing pages (event CRUD, moderation queue)
- `components/events/`, `components/home/`, `components/navigation/`, `components/form/` — feature-grouped components
- `stores/` — Pinia stores (`events.ts`, `editor.ts`, ...) — API calls + client state
- `api/` — HTTP client calls to the backend `/api/*`
- `auth/` — client-side auth state/guards (UI-only; real enforcement is backend-side)
- `utils/` — shared helpers (e.g. `eventLocation.ts`)

Map views use Leaflet (`EventMap.vue`). Rich text editing uses Tiptap (`@tiptap/vue-3`) with DOMPurify sanitization on the client and `sanitize-html` on the backend as defense in depth.

Tests live in `frontend/tests/`, mirroring component/store names (e.g. `eventsStore.test.ts`, `eventDetailView.test.ts`), using `@testing-library/vue` / `@vue/test-utils` + jsdom, not colocated with source.

## Environment

Copy `.env.example` to `.env` at repo root. Key vars: `DATABASE_URL` (Postgres), `JWT_SECRET`, `PHOTON_URL` (geocoding service), `UPLOAD_DIR`, `VITE_API_URL` (defaults to `/api`, proxied to the backend in dev). See [docker-compose.dev.yml](docker-compose.dev.yml) for the local Postgres + Photon stack.
