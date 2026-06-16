/**
 * Generic async data-access base class (PostgreSQL). Concrete repositories
 * extend it and inherit common CRUD helpers, so each stays small (DRY).
 */
import { db } from '../db/database.js';

export class BaseRepository {
  /** @param {string} table  the backing table name */
  constructor(table) {
    this.table = table;
    this.db = db;
  }

  async findById(id) {
    return this.db.get(`SELECT * FROM ${this.table} WHERE id = $1`, [id]);
  }

  async findAll(orderBy = 'id DESC') {
    return this.db.all(`SELECT * FROM ${this.table} ORDER BY ${orderBy}`);
  }

  /**
   * Insert a row from a plain object and return the persisted record (RETURNING).
   * Keys must be trusted column names (never raw request bodies) to avoid
   * mass-assignment issues.
   */
  async insert(data) {
    const keys = Object.keys(data);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${this.table} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const { rows } = await this.db.run(sql, Object.values(data));
    return rows[0];
  }

  /** Update selected columns by id and return the fresh record. */
  async update(id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id);
    const assignments = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const sql = `UPDATE ${this.table} SET ${assignments} WHERE id = $${keys.length + 1} RETURNING *`;
    const { rows } = await this.db.run(sql, [...Object.values(data), id]);
    return rows[0];
  }

  async delete(id) {
    return this.db.run(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
  }
}
