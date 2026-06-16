-- ============================================================================
-- CAB-Sessions schema (PostgreSQL)
-- ----------------------------------------------------------------------------
-- Multi-tenant: companies → projects → (tickets, members). A user can belong to
-- many projects, but every project's data is isolated (scoped by project_id and
-- enforced server-side). Idempotent: safe to run on every boot.
-- ============================================================================

-- ─── Roles (Section 3) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- ─── Users (global identity) ────────────────────────────────────────────────
-- GDPR: minimum PII (display name + email).
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  full_name       TEXT    NOT NULL,
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  role_id         INTEGER NOT NULL REFERENCES roles(id),
  mfa_secret      TEXT,
  mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Companies (tenants) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Projects (belong to a company) ─────────────────────────────────────────
-- Tickets are scoped here; projects are never merged.
CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  ado_project TEXT,                         -- future: Azure DevOps project mapping
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

-- ─── Project membership (user ↔ project) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- ─── CAB tickets (Section 1 — the table), scoped to a project ───────────────
CREATE TABLE IF NOT EXISTS cab_tickets (
  id                   SERIAL PRIMARY KEY,
  project_id           INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requestor            TEXT    NOT NULL,            -- 1. Requestors
  requested_date       TEXT    NOT NULL,            -- 2. Requested Date
  uat_proposed_date    TEXT,                        -- 3. UAT proposed Date
  prod_proposed_date   TEXT,                        -- 4. Prod proposed Date
  assignee             TEXT,                        -- 5. Assigned
  snow_ticket_number   TEXT,                        -- 6. ServiceNow CR number
  ado_ticket_number    TEXT,                        -- 7. Azure DevOps Feature number
  snow_description     TEXT,                        -- 8. SNOW CR description
  ado_description      TEXT,                        -- 9. ADO Feature description
  status               TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','in_review','decided')),
  created_by           INTEGER REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Review details (Section 2 — Tab 2) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_reviews (
  ticket_id          INTEGER PRIMARY KEY REFERENCES cab_tickets(id) ON DELETE CASCADE,
  tools_touched      TEXT,
  compliance_process TEXT,
  what_it_fixes      TEXT,
  what_deprecated    TEXT,
  ai_feedback        TEXT,                  -- AI-generated risks/questions/recommendation
  ai_generated_at    TIMESTAMPTZ,
  updated_by         INTEGER REFERENCES users(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Approvals (Section 2 — Tab 3) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id                 SERIAL PRIMARY KEY,
  ticket_id          INTEGER NOT NULL REFERENCES cab_tickets(id) ON DELETE CASCADE,
  decision           TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (decision IN ('approved','rejected','to_be_reviewed','pending')),
  decided_by         INTEGER REFERENCES users(id),
  decided_at         TIMESTAMPTZ,
  comment            TEXT,
  notified           BOOLEAN NOT NULL DEFAULT FALSE,
  integration_pushed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id)
);

-- ─── AI insights history (audit of every Claude generation) ─────────────────
CREATE TABLE IF NOT EXISTS ai_insights (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER REFERENCES cab_tickets(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  content     TEXT NOT NULL,
  model       TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Audit log (security / GDPR accountability) ─────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   INTEGER,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_project  ON cab_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON cab_tickets(status);
CREATE INDEX IF NOT EXISTS idx_members_user     ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_ticket ON approvals(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_ticket ON ai_insights(ticket_id, kind);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_log(entity, entity_id);
