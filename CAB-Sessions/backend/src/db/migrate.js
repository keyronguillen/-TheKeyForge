/**
 * Additive, idempotent migrations for databases created before a column existed.
 *
 * `CREATE TABLE IF NOT EXISTS` in schema.sql does NOT add new columns to an
 * already-existing table, so for upgrades we attempt the ALTERs here and ignore
 * the "duplicate column" error when the column is already present. Fresh installs
 * get the columns from schema.sql and these ALTERs simply no-op.
 */
import { db } from './database.js';
import { logger } from '../utils/logger.js';

const ADDITIVE_COLUMNS = [
  ['ticket_reviews', 'ai_feedback', 'TEXT'],
  ['ticket_reviews', 'ai_generated_at', 'TEXT'],
];

export function runMigrations() {
  for (const [table, column, type] of ADDITIVE_COLUMNS) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      logger.info(`Migration: added ${table}.${column}`);
    } catch (err) {
      // SQLite throws if the column already exists — that's the success case here.
      if (!/duplicate column/i.test(err.message)) throw err;
    }
  }
}
