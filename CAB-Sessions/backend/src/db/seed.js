/**
 * Idempotent database seed: creates the schema, the role catalogue, demo users
 * (across roles), and a few sample CAB tickets so the demo has content.
 *
 * Run with:  npm run seed
 *
 * NOTE: demo passwords are intentionally simple and printed to the console for
 * the POC only. Never seed real credentials this way in production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { db } from './database.js';
import { runMigrations } from './migrate.js';
import { ALL_ROLES, ROLES } from '../constants/roles.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function applySchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.connect();
  db.exec(schema);
  runMigrations();
}

function seedRoles() {
  for (const name of ALL_ROLES) {
    db.run('INSERT OR IGNORE INTO roles (name) VALUES (?)', [name]);
  }
}

async function seedUsers() {
  // [fullName, email, password, role]
  const demo = [
    ['CAB Administrator', 'admin@cab.local', 'Admin@12345', ROLES.ADMIN],
    ['Alex Approver', 'approver@cab.local', 'Approve@12345', ROLES.APPROVER],
    ['Casey Compliance', 'compliance@cab.local', 'Comply@12345', ROLES.COMPLIANCE],
    ['Riley Reviewer', 'reviewer@cab.local', 'Review@12345', ROLES.REVIEWER],
    ['Robin Reader', 'reader@cab.local', 'Reader@12345', ROLES.READER],
  ];

  for (const [fullName, email, password, role] of demo) {
    const exists = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) continue;
    const roleRow = db.get('SELECT id FROM roles WHERE name = ?', [role]);
    const hash = await bcrypt.hash(password, 12);
    db.run(
      `INSERT INTO users (full_name, email, password_hash, role_id, mfa_enabled)
       VALUES (?, ?, ?, ?, 0)`,
      [fullName, email, hash, roleRow.id],
    );
  }
}

function seedTickets() {
  if (db.get('SELECT COUNT(*) AS n FROM cab_tickets').n > 0) return;

  const admin = db.get("SELECT id FROM users WHERE email = 'admin@cab.local'");
  const samples = [
    {
      requestor: 'Payments Team', requested_date: '2026-06-01',
      uat: '2026-06-10', prod: '2026-06-17', assignee: 'approver@cab.local',
      snow: 'CHG0045123', ado: 'AB#10241',
      snowDesc: 'Upgrade payment gateway TLS to 1.3 and rotate certificates.',
      adoDesc: 'Feature: Harden payment gateway transport security.',
    },
    {
      requestor: 'Identity Team', requested_date: '2026-06-03',
      uat: '2026-06-12', prod: '2026-06-20', assignee: 'reviewer@cab.local',
      snow: 'CHG0045188', ado: 'AB#10302',
      snowDesc: 'Migrate auth service to new EntraID app registration.',
      adoDesc: 'Feature: EntraID app registration migration & token scopes.',
    },
    {
      requestor: 'Data Platform', requested_date: '2026-06-05',
      uat: '2026-06-15', prod: '2026-06-25', assignee: 'approver@cab.local',
      snow: 'CHG0045205', ado: 'AB#10355',
      snowDesc: 'Deprecate legacy ETL job and switch to streaming pipeline.',
      adoDesc: 'Feature: Replace nightly ETL with event-driven ingestion.',
    },
  ];

  for (const s of samples) {
    const t = db.run(
      `INSERT INTO cab_tickets
        (requestor, requested_date, uat_proposed_date, prod_proposed_date, assignee,
         snow_ticket_number, ado_ticket_number, snow_description, ado_description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.requestor, s.requested_date, s.uat, s.prod, s.assignee,
        s.snow, s.ado, s.snowDesc, s.adoDesc, admin.id],
    );
    // A starter review for the first ticket so Tab 2 isn't empty in the demo.
    if (s.snow === 'CHG0045123') {
      db.run(
        `INSERT INTO ticket_reviews
           (ticket_id, tools_touched, compliance_process, what_it_fixes, what_deprecated, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [t.lastInsertRowid,
          'Payment Gateway, Certificate Manager, API Gateway',
          'PCI-DSS change control; security sign-off required before Prod.',
          'Removes weak TLS ciphers; fixes audit finding SEC-204.',
          'TLS 1.1/1.2 fallback and the old wildcard certificate.',
          admin.id],
      );
    }
  }
}

async function main() {
  logger.info('Seeding CAB-Sessions database…');
  applySchema();
  // Order matters: roles → users → tickets (tickets reference the admin user).
  seedRoles();
  await seedUsers();        // async (bcrypt), so not inside a sync transaction
  seedTickets();

  logger.info('✔ Seed complete. Demo accounts:');
  console.table([
    { email: 'admin@cab.local', password: 'Admin@12345', role: 'Admin' },
    { email: 'approver@cab.local', password: 'Approve@12345', role: 'Approver' },
    { email: 'compliance@cab.local', password: 'Comply@12345', role: 'Compliance' },
    { email: 'reviewer@cab.local', password: 'Review@12345', role: 'Reviewer' },
    { email: 'reader@cab.local', password: 'Reader@12345', role: 'Reader' },
  ]);
  db.close();
}

main().catch((err) => { logger.error('Seed failed', err); process.exit(1); });
