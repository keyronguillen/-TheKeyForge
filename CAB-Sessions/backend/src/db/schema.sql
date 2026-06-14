-- ============================================================================
-- CAB-Sessions schema
-- ----------------------------------------------------------------------------
-- Written for SQLite but deliberately kept portable to Azure SQL / SQL Server:
--   * surrogate INTEGER PRIMARY KEYs  -> map to IDENTITY/BIGINT
--   * TEXT timestamps in ISO-8601     -> map to DATETIME2
--   * CHECK constraints for enums     -> identical in T-SQL
-- No SQLite-only features are used in table definitions.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ─── Roles (Section 3) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE
);

-- ─── Users ──────────────────────────────────────────────────────────────────
-- GDPR: we store the minimum PII (display name + email) needed to run a CAB.
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name       TEXT    NOT NULL,
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,           -- bcrypt
  role_id         INTEGER NOT NULL REFERENCES roles(id),
  -- MFA (TOTP / Google Authenticator)
  mfa_secret      TEXT,                       -- base32 secret, set at enrollment
  mfa_enabled     INTEGER NOT NULL DEFAULT 0, -- 0/1 boolean
  is_active       INTEGER NOT NULL DEFAULT 1, -- 0 = soft-deleted / anonymized
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── CAB tickets (Section 1 — the table) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cab_tickets (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  requestor            TEXT    NOT NULL,            -- 1. Requestors
  requested_date       TEXT    NOT NULL,            -- 2. Requested Date
  uat_proposed_date    TEXT,                        -- 3. UAT proposed Date
  prod_proposed_date   TEXT,                        -- 4. Prod proposed Date
  assignee             TEXT,                        -- 5. Assigned
  snow_ticket_number   TEXT,                        -- 6. ServiceNow CR number
  ado_ticket_number    TEXT,                        -- 7. Azure DevOps Feature number
  snow_description      TEXT,                        -- 8. SNOW CR description
  ado_description       TEXT,                        -- 9. ADO Feature description
  status               TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','in_review','decided')),
  created_by           INTEGER REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Review details (Section 2 — Tab 2) ─────────────────────────────────────
-- One-to-one with a ticket; holds the compliance / impact narrative.
CREATE TABLE IF NOT EXISTS ticket_reviews (
  ticket_id          INTEGER PRIMARY KEY REFERENCES cab_tickets(id) ON DELETE CASCADE,
  tools_touched      TEXT,   -- 1. What tools or features are touched
  compliance_process TEXT,   -- 2. Compliance process
  what_it_fixes      TEXT,   -- 3. What the update fixes
  what_deprecated    TEXT,   -- 4. What is deprecated
  ai_feedback        TEXT,   -- AI-generated risks / questions / recommendation (Claude)
  ai_generated_at    TEXT,   -- when ai_feedback was last produced
  updated_by         INTEGER REFERENCES users(id),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── AI insights history (audit trail of every Claude generation) ───────────
-- kind: 'draft_review' | 'feedback' | 'cab_report'. Append-only.
CREATE TABLE IF NOT EXISTS ai_insights (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER REFERENCES cab_tickets(id) ON DELETE CASCADE, -- NULL for whole-CAB reports
  kind        TEXT NOT NULL,
  content     TEXT NOT NULL,           -- JSON (draft) or markdown (feedback/report)
  model       TEXT,                    -- model id used, e.g. claude-haiku-4-5
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_ticket ON ai_insights(ticket_id, kind);

-- ─── Approvals (Section 2 — Tab 3) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id          INTEGER NOT NULL REFERENCES cab_tickets(id) ON DELETE CASCADE,
  decision           TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (decision IN ('approved','rejected','to_be_reviewed','pending')),
  decided_by         INTEGER REFERENCES users(id),
  decided_at         TEXT,                          -- Datetime approved
  comment            TEXT,
  notified           INTEGER NOT NULL DEFAULT 0,    -- email notification sent?
  integration_pushed INTEGER NOT NULL DEFAULT 0,    -- pushed to SNOW/ADO?
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Audit log (security / GDPR accountability) ─────────────────────────────
-- Immutable, append-only trail of who did what. Never updated or deleted.
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,           -- e.g. 'approval.decide'
  entity      TEXT,                    -- e.g. 'cab_ticket'
  entity_id   INTEGER,
  detail      TEXT,                    -- JSON snapshot / human note
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_status   ON cab_tickets(status);
CREATE INDEX IF NOT EXISTS idx_approvals_ticket ON approvals(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_log(entity, entity_id);
