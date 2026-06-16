/**
 * Database access layer (PostgreSQL via node-postgres).
 *
 * The class wraps a connection Pool so the rest of the app depends on a small,
 * stable surface (get/all/run/tx). All methods are async. SQL uses Postgres
 * positional params ($1, $2, …) and RETURNING for inserts.
 */
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

class Database {
  /** @type {import('pg').Pool|null} */
  #pool = null;

  /** Open the pool (idempotent). */
  connect() {
    if (this.#pool) return this.#pool;
    this.#pool = new Pool({
      connectionString: config.db.url,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
    this.#pool.on('error', (err) => logger.error('Postgres pool error', err));
    logger.info('Postgres pool created');
    return this.#pool;
  }

  get pool() {
    return this.#pool ?? this.connect();
  }

  /** Test-only: inject a pre-built pool (e.g. pg-mem) instead of a real connection. */
  _setPoolForTests(pool) {
    this.#pool = pool;
  }

  /** Run raw SQL (DDL or multiple statements). */
  async exec(sql) {
    return this.pool.query(sql);
  }

  /** Execute a statement; returns the pg result ({ rows, rowCount }). */
  async run(sql, params = []) {
    return this.pool.query(sql, params);
  }

  /** Fetch a single row (or null). */
  async get(sql, params = []) {
    const { rows } = await this.pool.query(sql, params);
    return rows[0] ?? null;
  }

  /** Fetch all matching rows. */
  async all(sql, params = []) {
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  /**
   * Run `fn(client)` inside a transaction on a dedicated client. Commits on
   * success, rolls back on throw. `fn` receives a small client with the same
   * get/all/run helpers so multi-table writes stay atomic.
   */
  async tx(fn) {
    const client = await this.pool.connect();
    const wrapped = {
      run: (sql, params = []) => client.query(sql, params),
      get: async (sql, params = []) => (await client.query(sql, params)).rows[0] ?? null,
      all: async (sql, params = []) => (await client.query(sql, params)).rows,
    };
    try {
      await client.query('BEGIN');
      const result = await fn(wrapped);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.#pool?.end();
    this.#pool = null;
  }
}

export const db = new Database();
