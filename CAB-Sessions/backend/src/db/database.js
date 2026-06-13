/**
 * Database access layer.
 *
 * Uses Node's built-in `node:sqlite` (no native compilation needed). The class
 * wraps the raw driver so the rest of the app depends on a small, stable surface
 * — if we later move to Azure SQL we only re-implement this one class.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class Database {
  /** @type {DatabaseSync|null} */
  #db = null;

  /** Open the connection, ensuring the parent folder exists. */
  connect() {
    if (this.#db) return this.#db;

    const dir = path.dirname(config.db.file);
    fs.mkdirSync(dir, { recursive: true });

    this.#db = new DatabaseSync(config.db.file);
    this.#db.exec('PRAGMA foreign_keys = ON;');
    logger.info(`SQLite connected at ${config.db.file}`);
    return this.#db;
  }

  /** Raw handle (lazily connects). */
  get handle() {
    return this.#db ?? this.connect();
  }

  /** Run a schema/DDL script. */
  exec(sql) {
    return this.handle.exec(sql);
  }

  /** Execute a write (INSERT/UPDATE/DELETE) with bound params. */
  run(sql, params = []) {
    return this.handle.prepare(sql).run(...params);
  }

  /** Fetch a single row (or undefined). */
  get(sql, params = []) {
    return this.handle.prepare(sql).get(...params);
  }

  /** Fetch all matching rows. */
  all(sql, params = []) {
    return this.handle.prepare(sql).all(...params);
  }

  /**
   * Run `fn` inside a transaction. Commits on success, rolls back on throw.
   * Keeps multi-table writes (e.g. ticket + review + approval) atomic.
   */
  transaction(fn) {
    const db = this.handle;
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  close() {
    this.#db?.close();
    this.#db = null;
  }
}

// Single shared instance (module singleton).
export const db = new Database();
