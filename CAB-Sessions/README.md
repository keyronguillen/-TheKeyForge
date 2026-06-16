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
| Database     | **PostgreSQL** (async, via `pg`) — durable; local via Docker, prod via Render Postgres |
| Real-time    | Socket.IO                                                |
| API          | Node.js + Express (OOP: controllers → services → repositories) |
| Frontend     | React + Vite (responsive PWA — works on **Web + Mobile**) |
| Auth / MFA   | Local Login/Register + TOTP MFA (Google Authenticator) + JWT |
| Tenancy      | Companies → Projects → memberships; data isolated per project (server-enforced) |

## Multi-tenant navigation (Section 5)

Companies own **projects**; a user can belong to several projects but works in one at a
time — **projects are never merged**. After login the user picks a project, then a left
side menu drives four views:

1. **Overview** — counts + lists of the buckets below.
2. **To present** — the working board (table + Review + Approval) for undecided tickets.
3. **Approved** — tickets approved in step 2.
4. **Declined / To review** — tickets rejected or sent back in step 2.

Tickets move between buckets automatically based on their decision. Isolation is enforced
server-side (every query is scoped by `project_id` + membership), not just hidden in the UI.

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
docker compose up -d        # start local Postgres (matches Render's engine)
npm install
copy .env.example .env      # then edit secrets (DATABASE_URL is preset for Docker)
npm run seed                # create schema + seed companies/projects/users/tickets
npm run dev                 # starts API + Socket.IO on http://localhost:4000
```
> On **Render**: create a free **PostgreSQL** instance, link it to the web service (Render
> injects `DATABASE_URL`), keep the build command `npm install && npm run seed`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                 # starts the UI on http://localhost:5173
```

### Demo accounts (created by the seed)
| Email                  | Password      | Role       | Sees                  |
|------------------------|---------------|------------|-----------------------|
| admin@cab.local        | Admin@12345   | Admin      | All companies         |
| approver@cab.local     | Approve@12345 | Approver   | Company1 + Company2    |
| compliance@cab.local   | Comply@12345  | Compliance | Company2              |
| reviewer@cab.local     | Review@12345  | Reviewer   | Company1              |
| reader@cab.local       | Reader@12345  | Reader     | Company3              |

> On first login each account enrolls MFA by scanning the QR code with Google Authenticator.
> The approver belongs to two projects (demonstrates "one user, multiple projects"); Admin sees all.

## Security & GDPR notes
- Passwords hashed with bcrypt; MFA secrets stored separately; JWT short-lived.
- Minimal PII collected (name + email only). Full audit trail of approvals/changes.
- Helmet security headers, input validation, parameterized SQL (no injection), CORS locked to the UI origin.
- `Right to erasure`: an Admin endpoint soft-anonymizes a user while preserving immutable audit integrity.
