/**
 * Generic data-access base class. Concrete repositories extend it and inherit
 * common CRUD helpers, so each entity repository stays tiny (DRY).
 */
import { db } from '../db/database.js';

export class BaseRepository {
  /** @param {string} table  the backing table name */
  constructor(table) {
    this.table = table;
    this.db = db;
  }

  findById(id) {
    return this.db.get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
  }

  findAll(orderBy = 'id DESC') {
    return this.db.all(`SELECT * FROM ${this.table} ORDER BY ${orderBy}`);
  }

  /**
   * Insert a row from a plain object and return the persisted record.
   * Column names come from the object keys — callers must pass trusted keys
   * (never raw request bodies) to avoid mass-assignment issues.
   */
  insert(data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const info = this.db.run(sql, Object.values(data));
    return this.findById(info.lastInsertRowid);
  }

  /** Update selected columns by id and return the fresh record. */
  update(id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id);
    const assignments = keys.map((k) => `${k} = ?`).join(', ');
    this.db.run(
      `UPDATE ${this.table} SET ${assignments} WHERE id = ?`,
      [...Object.values(data), id],
    );
    return this.findById(id);
  }

  delete(id) {
    return this.db.run(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
  }
}
