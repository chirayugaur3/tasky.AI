# tasky.AI — Operations Intelligence Platform

A role-aware, hierarchy-driven project management dashboard. The interface physically changes based on who's logged in: a Project Lead sees a dense intelligence cockpit; an Intern sees a clean task-and-status surface; an Executive sees the org at a glance; QR sees a review queue.

> **Live app:** _https://tasky-ai-pi.vercel.app/login

---

## TL;DR for evaluators

```bash
git clone <repo-url> && cd ethara-ai
cp .env.example .env          # then fill in DATABASE_URL, NEXTAUTH_SECRET, GROQ_API_KEY
docker compose up -d          # local Postgres on :5433
npm install
npm run db:migrate            # creates schema
npm run db:seed               # 7 users / 2 projects / 10 tasks
npm run dev                   # http://localhost:3000
```

Then open `http://localhost:3000` and click any **demo account** label below the login card to sign in instantly as that role.

---

## Seed credentials

All accounts use the same password: **`ethara.ai`**

| Role | Email | What they see |
|---|---|---|
| CEO | `ceo@ethara.ai` | Executive overview — all projects, aggregate stats |
| CTO | `cto@ethara.ai` | Same as CEO |
| TPM | `tpm@ethara.ai` | Same as CEO |
| Project Lead | `pl@ethara.ai` | The hero dashboard — blockers, today's tasks, team status, velocity, EOD generation |
| Quality Lead | `ql@ethara.ai` | Review activity table across all tasks |
| QR | `qr@ethara.ai` | Pending review queue — approve/reject with one click |
| Intern | `intern@ethara.ai` | "My Tasks" — segmented status control, inline blocker reasons |

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (Pages Router) | Per spec; mature SSR via `getServerSideProps`, server-side data fetching with direct Prisma access |
| Language | TypeScript everywhere | Type safety from DB → API → UI |
| Database | PostgreSQL 16 | Railway-friendly; supports Prisma `autoincrement()` for human-readable `TSK-####` IDs |
| ORM | Prisma 6.x | Type-safe queries; declarative migrations |
| Auth | NextAuth.js v4 with JWT strategy | Credentials provider + optional Google OAuth |
| AI | Groq (`llama-3.3-70b-versatile`) | EOD report generation; OpenAI-compatible API; very fast inference |
| Styling | Tailwind CSS with a custom design system | All tokens defined in `tailwind.config.ts` — no default Tailwind colors used |
| Icons | lucide-react | Consistent monoline icon set |

---

## Features

### Role-based access
- 7 distinct roles, each with its own dashboard and sidebar shape.
- Middleware enforces routing: an Intern cannot reach `/dashboard/pl`; an unauthenticated user is bounced to `/login`.
- API routes validate role on every privileged write (Intern cannot create tasks; QR alone can change QR status; only the lead of a project can EOD-report on it).

### PL hero dashboard (`/dashboard/pl`)
- Active blockers with duration ("Blocked 2d") and 3px red left bar.
- Today's tasks with status-colored left bars, assignee, time, priority.
- Right intelligence panel: team presence, velocity (this week vs last), 80%/95% completion forecast, EOD button.

### Projects flow
- Index (`/dashboard/pl/projects`): cards with health bar, DONE/TASKS/BLOCKERS stats, days-left chip.
- Detail (`/dashboard/pl/projects/[id]`): full task table with **QR Status** column, team workload bars, forecast.

### Team view (`/dashboard/pl/team`)
- Member table with role, current task, attendance, workload bar (color-coded by load), task count.
- Aggregate stats: avg workload, tasks active, blocked members.

### Task management
- Modal-based task creation (slide from right on desktop, bottom sheet on mobile).
- Intern-friendly segmented status control with inline blocker reason input.
- `blockedSince` is automatically set when status transitions into `BLOCKED` and cleared on transition out.

### EOD Report (`/dashboard/pl/eod`)
- Free-form context input.
- Server-side: pulls 24h task telemetry from the DB, builds a structured prompt, calls Groq with `response_format: json_object`.
- Output parsed against a Zod schema and rendered in three sections: Completed Today / Active Blockers / Tomorrow's Focus.
- Skeleton shimmer during generation. The 3-section output has 3px accent left bars matching the design.

### Executive view (`/dashboard/executive`)
- Org-wide stats tiles + a flat table of every project with health, lead, completion, blockers, deadline.

### QR & QL
- QR: pending queue with one-click Approve / Reject. The reviewer + timestamp are stored automatically.
- QL: read-only activity audit across all tasks.

---

## Architecture notes

- **Single-source-of-truth design tokens** in `tailwind.config.ts`. No raw color hexes in components.
- **API envelope:** every API route returns `{ data, error, status }` for predictable client handling.
- **Helpers:** `lib/api.ts` provides `requireAuth`, `requireRole`, `requireMethod`, and Zod-driven `parseBody` — used by every API route.
- **Sidebar = role contract:** `lib/nav.ts` defines a different nav list per role. The same `DashboardLayout` renders the right set automatically.
- **Mobile responsive:** sidebar collapses into a fixed bottom nav on `<sm` screens; tables become stacked cards via Tailwind responsive utilities; 3-column layouts stack.

---

## Environment variables

Copy `.env.example` to `.env` and fill these:

```
DATABASE_URL=postgresql://user:pass@host:port/db?schema=public
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000        # update to https URL in production
GOOGLE_CLIENT_ID=                          # optional
GOOGLE_CLIENT_SECRET=                      # optional
GROQ_API_KEY=gsk_...
```

Get a Groq key at [console.groq.com/keys](https://console.groq.com/keys). Get a Google OAuth client at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — set the authorized redirect to `<NEXTAUTH_URL>/api/auth/callback/google`.

---

## Database commands

```bash
npm run db:up           # docker compose up -d  (local Postgres on :5433)
npm run db:down         # tear it down
npm run db:migrate      # prisma migrate dev
npm run db:seed         # seed 7 users, 2 projects, 10 tasks
npm run db:reset        # nuke + re-migrate + re-seed
npm run db:studio       # Prisma Studio UI
```

---

## Verification scripts

Two scripts ship with the repo to verify the platform end-to-end:

```bash
bash scripts/verify-phase-a.sh    # 30 auth + routing assertions
bash scripts/verify-phase-b.sh    # 32 API + role-gating assertions
```

Both expect the dev server on `http://localhost:3000`.

---

## Deployment 

1. Push the repo to GitHub.
2. Create a new Railway project, connect the GitHub repo.
3. Add a **Postgres** service to the project. Railway injects `DATABASE_URL` automatically.
4. Set environment variables in the Railway dashboard:
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — your Railway-generated `https://<app>.up.railway.app`
   - `GROQ_API_KEY`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)
5. Railway auto-detects Next.js via Nixpacks. A `Dockerfile` and `railway.json` are included if you prefer container deployment.
6. After first deploy, run migration + seed once:
   ```bash
   railway run npm run db:migrate
   railway run npm run db:seed
   ```
