# CAB-Sessions

A proof-of-concept (POC) tool to **take control and ownership of CAB (Change Advisory Board) sessions**.
It centralizes ServiceNow Change Requests and Azure DevOps Features into a single review-and-approval
workflow, with role-based access, MFA, and live (real-time) updates during the meeting.

> Status: **POC / Demo**. ServiceNow & Azure DevOps integrations and Microsoft EntraID SSO are
> stubbed behind clean integration seams so they can be wired to real APIs later without rewrites.

---

## Tech stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Database     | SQLite (via Node's built-in `node:sqlite`) — schema is portable to Azure SQL / SQL Server |
| Real-time    | Socket.IO                                                |
| API          | Node.js + Express (OOP: controllers → services → repositories) |
| Frontend     | React + Vite (responsive PWA — works on **Web + Mobile**) |
| Auth / MFA   | Local Login/Register + TOTP MFA (Google Authenticator) + JWT |

## The 3 CAB tabs (Section 2)

1. **Tickets** — the CAB table (requestors, dates, assignee, SNOW/ADO ticket numbers & descriptions).
2. **Review** — what tools/features are touched, compliance process, what the update fixes, what is deprecated.
3. **Approval** — approve / reject / to-be-reviewed dropdown, email notification of the decision,
   decision timestamp, and (stubbed) push of the decision back to ServiceNow & ADO.

## Roles (Section 3)

`Admin`, `Compliance`, `Approver`, `Reviewer`, `Actor`, `Business`, `Reader`.

- **Admin** — full control over everything.
- **Approver / Compliance** — drive the approval & compliance sections (contributor-level).
- **Reader / Business** — read-only; can navigate the tool without changing anything.

## Getting started

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env      # then edit secrets
npm run seed                # create + seed the SQLite DB
npm run dev                 # starts API + Socket.IO on http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                 # starts the UI on http://localhost:5173
```

### Demo accounts (created by the seed)
| Email                  | Password      | Role       |
|------------------------|---------------|------------|
| admin@cab.local        | Admin@12345   | Admin      |
| approver@cab.local     | Approve@12345 | Approver   |
| compliance@cab.local   | Comply@12345  | Compliance |
| reader@cab.local       | Reader@12345  | Reader     |

> On first login each account enrolls MFA by scanning the QR code with Google Authenticator.

## Security & GDPR notes
- Passwords hashed with bcrypt; MFA secrets stored separately; JWT short-lived.
- Minimal PII collected (name + email only). Full audit trail of approvals/changes.
- Helmet security headers, input validation, parameterized SQL (no injection), CORS locked to the UI origin.
- `Right to erasure`: an Admin endpoint soft-anonymizes a user while preserving immutable audit integrity.
