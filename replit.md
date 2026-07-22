# Cotizador RGE Style Travel

A travel quotation (cotizador) and CRM system for RGE Style Travel agency. Agents can build, price, and track travel packages for clients.

## Stack

- **Frontend**: React + Vite + Tailwind CSS (port 5000) — lives in `artifacts/cotizador/`
- **Backend**: Express + Drizzle ORM + PostgreSQL (port 8080) — lives in `artifacts/api-server/`
- **Database schema**: `lib/db/src/schema/`
- **Shared types/zod**: `lib/api-zod/`

## Running the app

The workflow **Start application** runs everything:

```
PUPPETEER_SKIP_DOWNLOAD=true pnpm install && pnpm --filter @workspace/api-server run build && (PORT=8080 pnpm --filter @workspace/api-server run start & PORT=5000 BASE_PATH=/ pnpm --filter @workspace/cotizador run dev)
```

## Database setup

The `DATABASE_URL` environment variable is already configured. To apply schema changes:

```
cd lib/db && pnpm run push
```

## Default users

Seed users are defined in `artifacts/api-server/src/lib/seed.ts`. Default credentials are managed internally — check that file for usernames and initial passwords.

## User preferences
