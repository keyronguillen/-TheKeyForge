/**
 * Idempotent database seed (async / PostgreSQL): schema + roles + demo users +
 * companies/projects/memberships + sample CAB tickets per project.
 *
 * Run with:  npm run seed   (or it runs automatically on first boot if empty)
 *
 * Demo passwords are intentionally simple and printed for the POC only.
 * Multi-tenant demo: 3 companies, each with a project, each demo user mapped to
 * one company's project (Admin sees all). Projects never merge.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { db } from './database.js';
import { runMigrations } from './migrate.js';
import { ALL_ROLES, ROLES } from '../constants/roles.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projects = new ProjectRepository();

async function applySchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.connect();
  await db.exec(schema);
  await runMigrations();
}

async function seedRoles() {
  for (const name of ALL_ROLES) {
    await db.run('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  }
}

const DEMO_USERS = [
  ['CAB Administrator', 'admin@cab.local', 'Admin@12345', ROLES.ADMIN],
  ['Alex Approver', 'approver@cab.local', 'Approve@12345', ROLES.APPROVER],
  ['Casey Compliance', 'compliance@cab.local', 'Comply@12345', ROLES.COMPLIANCE],
  ['Riley Reviewer', 'reviewer@cab.local', 'Review@12345', ROLES.REVIEWER],
  ['Robin Reader', 'reader@cab.local', 'Reader@12345', ROLES.READER],
];

async function seedUsers() {
  const ids = {};
  for (const [fullName, email, password, role] of DEMO_USERS) {
    const role_id = (await db.get('SELECT id FROM roles WHERE name = $1', [role])).id;
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.run(
      `INSERT INTO users (full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      [fullName, email, hash, role_id],
    );
    ids[email] = rows[0].id;
  }
  return ids;
}

/**
 * Companies/projects + memberships. Each demo user belongs to one company; the
 * approver also sits on a second project to show "one user, multiple projects".
 */
async function seedTenancy(userIds) {
  const map = {}; // company name -> project row
  for (const company of ['Company1', 'Company2', 'Company3']) {
    const c = await projects.upsertCompany(company);
    const p = await projects.upsertProject(c.id, `${company} CAB`);
    map[company] = p;
  }
  // Memberships (Admin sees all projects automatically — no row needed).
  await projects.addMember(map.Company1.id, userIds['approver@cab.local']);
  await projects.addMember(map.Company1.id, userIds['reviewer@cab.local']);
  await projects.addMember(map.Company2.id, userIds['compliance@cab.local']);
  await projects.addMember(map.Company2.id, userIds['approver@cab.local']); // multi-project user
  await projects.addMember(map.Company3.id, userIds['reader@cab.local']);
  return map;
}

async function seedTickets(projectMap, userIds) {
  const count = Number((await db.get('SELECT COUNT(*) AS n FROM cab_tickets')).n);
  if (count > 0) return;
  const admin = userIds['admin@cab.local'];

  const byCompany = {
    Company1: [
      { requestor: 'Payments Team', requested: '2026-06-01', uat: '2026-06-10', prod: '2026-06-17',
        assignee: 'approver@cab.local', snow: 'CHG0045123', ado: 'AB#10241',
        snowDesc: 'Upgrade payment gateway TLS to 1.3 and rotate certificates.',
        adoDesc: 'Feature: Harden payment gateway transport security.',
        review: {
          tools: 'Payment Gateway, Certificate Manager, API Gateway',
          compliance: 'PCI-DSS change control; security sign-off required before Prod.',
          fixes: 'Removes weak TLS ciphers; fixes audit finding SEC-204.',
          deprecated: 'TLS 1.1/1.2 fallback and the old wildcard certificate.',
        } },
    ],
    Company2: [
      { requestor: 'Identity Team', requested: '2026-06-03', uat: '2026-06-12', prod: '2026-06-20',
        assignee: 'compliance@cab.local', snow: 'CHG0045188', ado: 'AB#10302',
        snowDesc: 'Migrate auth service to new EntraID app registration.',
        adoDesc: 'Feature: EntraID app registration migration & token scopes.' },
    ],
    Company3: [
      { requestor: 'Data Platform', requested: '2026-06-05', uat: '2026-06-15', prod: '2026-06-25',
        assignee: 'reader@cab.local', snow: 'CHG0045205', ado: 'AB#10355',
        snowDesc: 'Deprecate legacy ETL job and switch to streaming pipeline.',
        adoDesc: 'Feature: Replace nightly ETL with event-driven ingestion.' },
    ],
  };

  for (const [company, items] of Object.entries(byCompany)) {
    const projectId = projectMap[company].id;
    for (const s of items) {
      const { rows } = await db.run(
        `INSERT INTO cab_tickets
          (project_id, requestor, requested_date, uat_proposed_date, prod_proposed_date, assignee,
           snow_ticket_number, ado_ticket_number, snow_description, ado_description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [projectId, s.requestor, s.requested, s.uat, s.prod, s.assignee,
          s.snow, s.ado, s.snowDesc, s.adoDesc, admin],
      );
      if (s.review) {
        await db.run(
          `INSERT INTO ticket_reviews (ticket_id, tools_touched, compliance_process, what_it_fixes, what_deprecated, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [rows[0].id, s.review.tools, s.review.compliance, s.review.fixes, s.review.deprecated, admin],
        );
      }
    }
  }
}

export async function seed() {
  await applySchema();
  await seedRoles();
  const userIds = await seedUsers();
  const projectMap = await seedTenancy(userIds);
  await seedTickets(projectMap, userIds);
}

async function main() {
  logger.info('Seeding CAB-Sessions database…');
  await seed();
  logger.info('✔ Seed complete. Demo accounts:');
  console.table([
    { email: 'admin@cab.local', password: 'Admin@12345', role: 'Admin', sees: 'All companies' },
    { email: 'approver@cab.local', password: 'Approve@12345', role: 'Approver', sees: 'Company1 + Company2' },
    { email: 'compliance@cab.local', password: 'Comply@12345', role: 'Compliance', sees: 'Company2' },
    { email: 'reviewer@cab.local', password: 'Review@12345', role: 'Reviewer', sees: 'Company1' },
    { email: 'reader@cab.local', password: 'Reader@12345', role: 'Reader', sees: 'Company3' },
  ]);
  await db.close();
}

// Run as a script (npm run seed). When imported (auto-seed on boot), only `seed` is used.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.js')) {
  main().catch((err) => { logger.error('Seed failed', err); process.exit(1); });
}
