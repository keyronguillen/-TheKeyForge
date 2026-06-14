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

## AI assistant (Claude)

Powered by Claude (Anthropic SDK, model **Haiku 4.5** by default). Available to roles
`Admin / Compliance / Reviewer / Approver` when the backend has an `ANTHROPIC_API_KEY`:

- **✨ Draft with AI** (Tab 2) — pre-fills the four review fields from the ticket's SNOW/ADO text.
- **🧠 AI feedback** (Tab 2) — risks, missing info, questions and a recommendation; saved on the ticket.
- **📄 AI CAB report** — a post-CAB executive summary across all tickets (copy-to-clipboard).

If no key is set, AI features self-disable and the rest of the app works normally. The key lives
**only on the backend** (never the frontend). Every generation is logged to the `ai_insights` audit
table. **GDPR note:** ticket text is sent to Anthropic for processing — keep real PII out of POC
tickets and document the data-processing dependency in any compliance review.

To enable: set `ANTHROPIC_API_KEY` (and optionally `AI_MODEL`) in the backend environment.

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
