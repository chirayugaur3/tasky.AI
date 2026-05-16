# Tasky.AI — An intelligent manager who handles your tasks

A role-aware, hierarchy-driven project management dashboard. The interface physically changes based on who's logged in: a **Project Lead** sees a dense intelligence cockpit; an **Intern** sees a clean task-and-status surface; an **Executive** sees the org at a glance; a **QR** sees a review queue.

> **🟢 Live app:** https://tasky-ai-pi.vercel.app/login

---

## 60-second evaluator path

1. Open the live URL.
2. Click **Admin** to land as Aryan Sharma (Project Lead) — see blockers, today's tasks, team status, velocity, forecast.
3. Sign out → click **User** to land as Rahul Verma (Intern) — see "My Tasks" with one-tap segmented status control + inline blocker reason.
4. As Admin → sidebar → **EOD Report** → type any context → **Generate Report** → Groq returns structured Completed / Blockers / Tomorrow's Focus.

---

## Seed credentials

Same password for everyone: **`ethara.ai`**

| Login button | Email | Role | View |
|---|---|---|---|
| **Admin** | `pl@ethara.ai` | Project Lead | Full operations dashboard, projects, tasks, team, EOD |
| **User** | `intern@ethara.ai` | Intern | "My Tasks" only — segmented status control |

Additional accounts (use the email form to log in):

| Email | Role | Title |
|---|---|---|
| `ceo@ethara.ai` | CEO | Sanjay Kapoor — Chief Executive Officer |
| `cto@ethara.ai` | CTO | Priya Nair — Chief Technology Officer |
| `tpm@ethara.ai` | TPM | Rohan Mehta — Technical Program Manager |
| `pl2@ethara.ai` | Project Lead | Maya Krishnan — Lead, Evaluation |
| `ql@ethara.ai` | Quality Lead | Vikram Patel — Head of ML Eval |
| `qr@ethara.ai` | QR | Kira Lin — Senior ML Researcher |
| `qr2@ethara.ai` | QR | Daniel Brooks — ML Researcher |
| `intern2@ethara.ai` | Intern | Ananya Iyer — ML Engineer |
| `intern3@ethara.ai` | Intern | Marcus Johnson — Research Engineer |
| `intern4@ethara.ai` | Intern | Sofia Chen — Engineering Intern |
| `intern5@ethara.ai` | Intern | Diego Lopez — Research Intern |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 14 (Pages Router)** + TypeScript |
| Database | **PostgreSQL** (Neon on production, Docker Postgres locally) |
| ORM | **Prisma 6** with type-safe queries + migrations |
| Auth | **NextAuth.js v4** — Credentials + optional Google OAuth, JWT strategy |
| AI | **Groq** (`llama-3.3-70b-versatile`) for EOD report generation |
| Styling | **Tailwind CSS** with a fully custom design system (no default Tailwind colors) |
| Icons | **lucide-react** |
| Forms / validation | **react-hook-form** + **Zod** |
| Hosting | **Vercel** |

---

## Features

### Role-based access
- 7 distinct roles, each routed to a different dashboard by **middleware** at the edge.
- API routes enforce role checks on every privileged write (Intern can't create tasks; QR alone can change QR status; only the lead of a project can EOD-report on it).

### PL hero dashboard
- **Active blockers** with duration ("Blocked 2d") and 3px red left bar — single click opens edit drawer.
- **Today's tasks** — status-colored left bars, assignee, time, P1/P2/P3 priority. Single click opens edit drawer.
- **Right intelligence panel:** team presence (cap 6, absent first), velocity (this week vs last), 80/95% completion forecast, EOD button.
- Cmd+Enter / Esc keyboard shortcuts in all modals.

### Projects flow
- **Index:** 5–8 project cards with health-colored 3px left border, DONE/TASKS/BLOCKERS stats, days-left chip.
- **Detail:** task table with **QR Status** column, **Team Workload** bars (color-coded by load), **Forecast** section.
- **+ New Project** modal (name, description, deadline, initial health).
- **+ Add Member** modal on project detail — search + multi-select from non-members.

### Task management
- Slide-from-right **TaskModal** for create + edit. Bottom sheet on mobile.
- **`blockedSince`** automatically set when status transitions into `BLOCKED`, cleared on transition out.
- Intern-friendly **segmented status control** with inline blocker reason input.

### EOD Report (Groq)
- Free-form context input → server-side pulls 24h task telemetry from DB → Groq with `response_format: json_object` → Zod-validated 3-section output: **Completed Today / Active Blockers / Tomorrow's Focus**.
- Skeleton shimmer during generation. Persisted to `EODReport` table.

### Other dashboards
- **Executive** (CEO / CTO / TPM): org-wide stat tiles + flat project table.
- **QR:** pending review queue → one-click Approve / Reject. Reviewer + timestamp auto-stored.
- **QL:** read-only quality audit table across all tasks.
- **Intern:** "My Tasks" + segmented status control + inline blocker reason + "Completed today" rail.

---

## Real Ethara-flavored seed data

This is not generic demo data. Project names and task titles map to actual Ethara AI initiatives:

| Project | Health | Tasks include… |
|---|---|---|
| **Project Leviathan** | 🔴 Blocked | QC Sweep — Submissions 140-152, Atelier Noir Asset Refresh, PRD Word-Count Validator |
| **Project Sisyphus** | 🟡 At risk | Express.js Profile Log Parser Broken, Webpack test_cmd Fix, Draft v0.4 Audit Report |
| **RLHF Training Pipeline v2** | 🟢 On track | DDP Gradient Bucketing, NCCL All-Reduce Latency |
| **Atelier Noir Reference Library** | 🟢 On track | Onboard 3 New Reference Sites, Reference PRD Style Audit |
| **Agent Tool-Use Benchmark** | 🟢 On track | Environment Sandbox v0.1, Trajectory Scoring Rubric |
| **Constitutional AI Fine-tune** | 🟡 At risk | Self-Critique Prompt Templates, Constitution Document v0.2 |
| **Multi-modal RL Curriculum** | 🔴 Blocked | Vision Encoder Integration, Curriculum Difficulty Sampler |
| **Safety Red-Team Pipeline** | 🟢 On track | Adversarial Probe Catalogue, Automated Jailbreak Detector |

**13 users · 8 projects · 28 tasks · 47 memberships**

---

## Local development

```bash
git clone https://github.com/chirayugaur3/tasky.AI.git
cd tasky.AI
cp .env.example .env          # then fill in DATABASE_URL, NEXTAUTH_SECRET, GROQ_API_KEY
docker compose up -d          # local Postgres on :5433
npm install
npm run db:migrate            # creates schema
npm run db:seed               # 13 users / 8 projects / 28 tasks
npm run dev                   # http://localhost:3000
```

### Database commands

```bash
npm run db:up           # docker compose up -d  (local Postgres on :5433)
npm run db:down         # tear it down
npm run db:migrate      # prisma migrate dev
npm run db:seed         # seed 13 users, 8 projects, 28 tasks
npm run db:reset        # nuke + re-migrate + re-seed
npm run db:studio       # Prisma Studio UI
```

### Verification scripts

```bash
bash scripts/verify-phase-a.sh    # 30 auth + routing assertions
bash scripts/verify-phase-b.sh    # 32 API + role-gating assertions
bash scripts/smoke-all-roles.sh   # all 5 role pages return 200
```

---

## Environment variables

```bash
DATABASE_URL=postgresql://user:pass@host:port/db?schema=public
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000        # update to https://<your-app>.vercel.app in prod
GOOGLE_CLIENT_ID=                          # optional Google OAuth
GOOGLE_CLIENT_SECRET=                      # optional Google OAuth
GROQ_API_KEY=gsk_...                       # https://console.groq.com/keys
INIT_SECRET=tasky-init-2026                # secret for one-shot DB init endpoint
```

---

## Deployment — Vercel

1. Push to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js.
3. Add a Postgres database (Storage tab → Create Database → Neon). It auto-injects `DATABASE_URL`.
4. Add the remaining env vars: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GROQ_API_KEY`, `INIT_SECRET`.
5. Redeploy.
6. **One-shot DB init** — hit this URL once to push the schema and seed:
   ```bash
   curl -X POST "https://<your-app>.vercel.app/api/admin/init?secret=tasky-init-2026"
   ```
   It is idempotent — subsequent calls skip seeding if users already exist.

---

## Project structure

```
tasky.AI/
├── prisma/
│   ├── schema.prisma                   # User, Project, Task, TeamMember, EODReport + enums
│   └── seed.ts                         # idempotent seed
├── pages/
│   ├── api/
│   │   ├── admin/init.ts               # one-shot schema-push + seed
│   │   ├── auth/[...nextauth].ts
│   │   ├── projects/[index, id, id/metrics]
│   │   ├── tasks/[index, id]
│   │   ├── team/index.ts               # GET members + POST add + PATCH attendance
│   │   ├── users/index.ts              # GET users (with notInProject filter)
│   │   └── eod/generate.ts             # Groq LLM call
│   ├── dashboard/
│   │   ├── pl.tsx                      # PL home (hero)
│   │   ├── pl/projects.tsx             # projects index
│   │   ├── pl/projects/[id].tsx        # project detail
│   │   ├── pl/tasks.tsx                # full task list with filters
│   │   ├── pl/team.tsx                 # team view
│   │   ├── pl/eod.tsx                  # EOD report
│   │   ├── executive.tsx               # CEO/CTO/TPM overview
│   │   ├── ql.tsx                      # Quality Lead audit
│   │   ├── qr.tsx                      # QR review queue
│   │   └── intern.tsx                  # Intern view
│   ├── login.tsx                       # 2-button Admin/User login + email form
│   └── index.tsx                       # → /login
├── components/
│   ├── layout/                         # Sidebar, BottomNav (mobile), DashboardLayout
│   ├── dashboard/                      # BlockerAlert, TaskRow, PLRightPanel
│   ├── projects/                       # ProjectCard, ProjectModal, AddMemberModal
│   ├── tasks/                          # StatusBadge, PriorityChip, TaskModal, InternTaskCard
│   ├── ui/                             # Avatar
│   └── auth/                           # StubDashboard
├── lib/
│   ├── api.ts                          # ok / fail / requireAuth / requireRole / parseBody
│   ├── auth.ts                         # NextAuth config (Credentials + Google)
│   ├── eod.ts                          # Groq EOD generator
│   ├── prisma.ts                       # Prisma singleton
│   ├── nav.ts                          # per-role sidebar config
│   ├── roles.ts                        # role → home path mapping
│   ├── format.ts                       # date / initials / priority label helpers
│   ├── session-utils.ts                # SSR serialization fix
│   └── cn.ts                           # clsx + tailwind-merge
├── hooks/useRole.ts
├── middleware.ts                       # role-based routing
├── styles/globals.css                  # design system base
├── tailwind.config.ts                  # design tokens
├── docker-compose.yml                  # local Postgres
├── Dockerfile + railway.json           # optional container deploy
└── scripts/
    ├── verify-phase-a.sh               # 30 auth assertions
    ├── verify-phase-b.sh               # 32 API assertions
    └── smoke-all-roles.sh              # all role pages return 200
```

---

## Design philosophy

This product was built against a strict UX philosophy: **make the Project Lead feel like the most informed person in the room.** That means:

- **Color is communication, never decoration.** Red means blocked. Orange means at risk. Green means healthy. Purple means actionable. These mappings are consistent across every screen.
- **3-second rule.** Every primary screen answers its core question (what's blocked? what's due today? what needs my review?) within 3 seconds of opening.
- **Density is respect.** PL gets ~28 px row heights and information-dense layouts because complexity IS their job. The Intern gets radical simplicity because clarity is theirs.
- **No celebration. No condescension.** Task completion doesn't trigger confetti. Status changes happen on a single click — no "are you sure?". The product trusts the user.
- **Elevation through color, not shadow.** `#0D0D14` is canvas, `#13131E` is surface, `#1C1C2E` is elevated. Shadows only on floating modals.

---

## Built with

- **Code:** Next.js 14, TypeScript, Prisma 6, NextAuth.js v4, Tailwind CSS, Groq SDK
- **Icons:** Lucide
- **Hosting:** Vercel + Neon Postgres
- **Inspiration:** Linear, Height, Vercel — for the "engineered, not designed" aesthetic
