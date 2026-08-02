import { pool } from "./index";

/**
 * Creates the development schema when the project is started against a new
 * Replit database. Every statement is additive and idempotent: existing
 * tables and rows are never removed or truncated.
 *
 * Production schemas are managed by the publish flow; the API only calls this
 * bootstrap in non-production environments.
 */
export async function ensureDevelopmentSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      username TEXT UNIQUE,
      correo TEXT,
      contrasena_hash TEXT NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS agencias (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      logo_url TEXT,
      contacto TEXT,
      telefono TEXT,
      correo TEXT,
      predeterminada BOOLEAN NOT NULL DEFAULT FALSE,
      pais TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE agencias ADD COLUMN IF NOT EXISTS pais TEXT`,
    `CREATE TABLE IF NOT EXISTS agentes (
      id TEXT PRIMARY KEY,
      agencia_id TEXT NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      correo TEXT,
      telefono TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS counters (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS plantillas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      bloques JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS observaciones (
      id TEXT PRIMARY KEY,
      texto TEXT NOT NULL,
      categoria TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 0,
      activo BOOLEAN NOT NULL DEFAULT TRUE
    )`,
    `CREATE TABLE IF NOT EXISTS tarifas (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      datos JSONB NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS descriptivos_custom (
      id TEXT PRIMARY KEY,
      codigo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      datos JSONB NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS cotizaciones (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL,
      estado_crm TEXT NOT NULL DEFAULT 'nueva',
      prioridad TEXT NOT NULL DEFAULT 'media',
      anulada BOOLEAN NOT NULL DEFAULT FALSE,
      opportunity_id TEXT,
      created_by_id INTEGER REFERENCES usuarios(id),
      created_by_name TEXT,
      updated_by_id INTEGER REFERENCES usuarios(id),
      updated_by_name TEXT,
      datos JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS oportunidades (
      id TEXT PRIMARY KEY,
      agency_name TEXT NOT NULL DEFAULT '',
      agent_name TEXT NOT NULL DEFAULT '',
      counter_name TEXT NOT NULL DEFAULT '',
      quote_name TEXT NOT NULL DEFAULT '',
      destination TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'nueva',
      created_by_id INTEGER REFERENCES usuarios(id),
      created_by_name TEXT,
      datos JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
