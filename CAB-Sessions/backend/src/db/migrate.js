/**
 * Additive, idempotent migrations.
 *
 * The Postgres schema in schema.sql is fully idempotent (CREATE TABLE/INDEX IF
 * NOT EXISTS), so on a fresh database nothing extra is needed. This hook exists
 * for future additive changes — use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`,
 * which Postgres supports natively and which no-ops when the column exists.
 */
import { db } from './database.js';

const ADDITIVE = [
  // Example shape for future use:
  // 'ALTER TABLE cab_tickets ADD COLUMN IF NOT EXISTS some_col TEXT',
];

export async function runMigrations() {
  for (const sql of ADDITIVE) {
    await db.run(sql);
  }
}
