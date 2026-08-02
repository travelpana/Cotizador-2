---
name: Schema drift between Drizzle and DB
description: Adding a column to the Drizzle schema without migrating the DB breaks every SELECT on that table
---

Rule: whenever a column is added to `lib/db/src/schema/data.ts`, an idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` must also be added to `ensureDevelopmentSchema` in `lib/db/src/bootstrap.ts` (it only runs `CREATE TABLE IF NOT EXISTS`, so existing dev DBs are never altered otherwise), and any backup/bulk-sync DTOs must include the new field.

**Why:** Drizzle's `db.select()` enumerates every schema column, so a missing DB column makes ALL reads of the table fail with 500 ("column does not exist") — symptom: list empty in UI while data still exists. This exactly happened with `agencias.pais` (Aug 2026). Production schema syncs only on Publish, so prod stays broken until the user republishes.

**How to apply:** on any schema column addition — update bootstrap.ts, backup export/import in `artifacts/api-server/src/routes/backup.ts`, and bulk-sync payload types; remind user to republish for prod.
