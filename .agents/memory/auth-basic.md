---
name: Basic Auth (Usuarios Nivel 1)
description: JWT login/logout system — architecture decisions and constraints for Phase 1
---

## What was built
Single-type user auth with email + password, JWT (30d), stored in localStorage.

## Key decisions

**Why no user management API:**
Phase 1 scope is login/logout only. CRUD, roles, and admin panel are Phase 2.

**Default seed user:**
`admin@rgestyletravel.com` / `rge2025` — auto-created at server startup if `usuarios` table is empty. Lives in `artifacts/api-server/src/lib/seed.ts`.

**JWT secret:**
`process.env.SESSION_SECRET ?? "rge-jwt-secret-dev-2025"` — set `SESSION_SECRET` env var in production.

**Storage keys:**
- `cotizador.authToken` — JWT token
- `cotizador.activeUser` — `{ id, nombre, correo }` JSON

**Auth endpoints (only two):**
- `POST /api/auth/login` — returns `{ token, user }`
- `GET /api/auth/me` — verifies token, returns user payload

**How to apply:**
- Adding a user → currently must be done directly in DB (`INSERT INTO usuarios`)
- Phase 2 will add admin UI for user management and roles

## DB schema
`usuarios` table: `id, nombre, correo, contrasena_hash, activo, created_at`. Schema is in `lib/db/src/schema/users.ts`.

## Quote tracking
- `CotizacionGuardada.createdByName` / `updatedByName` — set from `user?.nombre` in `handleSave`
- `Opportunity.createdByName` — propagated through `buildOppInput`
- `OppHistorialEntry.byUser` / `ActividadEntry.byUser` — set on every history entry
- Backup includes `activeUser: { nombre, correo }` from localStorage
