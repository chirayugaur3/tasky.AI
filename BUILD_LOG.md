# Ethara AI — Build Log

> **Purpose of this file:** running source-of-truth of everything that's been built, every decision made, and what's still pending. Read this back at the top of any session before continuing work, so we don't repeat or hallucinate state. Update after every meaningful step.

---

## Locked Decisions

| # | Question | Answer | Reason |
|---|----------|--------|--------|
| 1 | Brand name | **Ethara AI** | User typed it consciously in the spec; image typo "Etahra" is ignored. |
| 2 | Project folder | `/Users/chirayugaur/Desktop/ethara-ai` | Kebab-case, no spaces, top of Desktop, separate from SWE-smith. |
| 3 | Wordmark spelling | "Ethara AI" / "ETHARA AI" everywhere user-facing |  |
| 4 | Password label on login | **PASSCODE** (cosmetic only; field still maps to `password` column) | Matches Image 1 exactly. |
| 5 | Seed password (all roles) | `ethara.ai` | Per Section 2. Section 9 mentioned `valkyrie123` — ignored as a stale copy-paste. |
| 6 | Auth providers | **Dual: Credentials + Google** | Credentials for instant role demo (1-click as any of 7 seeded users). Google as optional modern OAuth path. |
| 7 | Google OAuth | Code wired now; env vars empty until user provides `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. | Doesn't block Phase A. |
| 8 | Dockerfile | Yes, we'll write one | User requested. Railway also auto-builds without it; Dockerfile is for portability / explicit control. |
| 9 | Mobile responsive | Required | Sidebar → bottom nav on mobile; 3-col layouts stack; task modal → bottom sheet; tables → card list; tap targets ≥44px. |
| 10 | Sidebar shape | One per role (PL has 5 items, Intern has 2, etc.) | Image-derived. The "interface physically changes by role" promise. |
| 11 | Task ID format | `TSK-${taskNumber}` zero-padded to 4 digits | Matches Image 7. |
| 12 | Workload formula | `min(100, openNonBlockedTasks * 12.5 + HIGH_priority * 6.25)` | Crude but realistic on the seed dataset. Tunable later. |
| 13 | Velocity | Tasks completed this week vs last week (simple count) | Matches Image 2 (`42` / `38`). |
| 14 | Claude model | `claude-sonnet-4-5` (current) | Spec hardcoded a stale `claude-sonnet-4-20250514`. |
| 15 | Status visual signal | Colored text + 3px left border on row | No filled badges. Per spec + images. |
| 16 | Priority display in tables | `P1` / `P2` / `P3` text (HIGH=P1) | Matches Image 2. |
| 17 | Priority chips in modal | Three buttons with semantic outlines | Selected Medium = amber outline (Image 8). |
| 18 | Schema additions to spec | `Task.qrStatus`, `Task.qrReviewedById`, `Task.qrReviewedAt`, `Task.blockedSince`, `Task.taskNumber` | Required to render Image 4 (QR Status column) and Image 7 (TSK-#### ID) and PL dashboard ("Blocked 2d"). |

---

## Image-to-Screen Mapping

| Image | Screen | Status |
|-------|--------|--------|
| 1 | `/login` | pending |
| 2 | `/dashboard/pl` (PL home) | pending |
| 3 | `/dashboard/pl/projects` (projects index) | pending |
| 4 | `/dashboard/pl/projects/[id]` (project detail) | pending |
| 5 | `/dashboard/pl/eod` (EOD report) | pending |
| 6 | `/dashboard/pl/team` (team view) | pending |
| 7 | `/dashboard/intern` (intern view) | pending |
| 8 | Task creation modal (panel from right; bottom sheet on mobile) | pending |

---

## Build Progress

### Phase B — Shell & APIs ✅ DONE

#### B1 — API helpers ✅
- `lib/api.ts`: `ok()`, `fail()`, `requireAuth()`, `requireRole()`, `requireMethod()`, `parseBody()` with Zod. Standard response envelope `{ data, error, status }`.

#### B2 — Claude client ✅
- `lib/claude.ts`: lazy-initialised Anthropic client. `generateEODReport(plContext, telemetry)` returns Zod-validated `EODReport`. Strips markdown fences if model adds them. Uses model `claude-sonnet-4-5` (current at the time of build).

#### B3–B9 — All API routes ✅
| Route | Methods | Notes |
|---|---|---|
| `/api/projects` | GET, POST | Executives see all; others see led-or-member projects. POST gated to PROJECT_LEAD + executives. PL becomes lead by default. |
| `/api/projects/[id]` | GET, PATCH, DELETE | Member-or-lead-or-exec for GET. PL can only PATCH/DELETE projects they lead. Cascade delete handles tasks + memberships + EOD reports. |
| `/api/projects/[id]/metrics` | GET | Computed: velocity (this/last week DONE counts), forecast (80% and 95% confidence dates), workload per member (weighted by priority, capped at 100%). |
| `/api/tasks` | GET, POST | Intern auto-filtered to own tasks. POST gated to PL/QL/executives; PL only for their own projects. |
| `/api/tasks/[id]` | GET, PATCH, DELETE | **blockedSince state machine**: set on transition into BLOCKED, cleared on transition out. Field-level auth: Intern can only update status + blockerReason on own tasks. Only QR + QL can change qrStatus; on change, qrReviewedBy + qrReviewedAt auto-populate. |
| `/api/team` | GET, PATCH | GET returns members + currentTask + workloadPct + aggregate stats (present/absent/avgWorkload/tasksActive/blockedMembers). PATCH attendance gated to project lead + executives. |
| `/api/eod/generate` | POST | PL-only, lead-of-this-project only. Pulls 24h task telemetry, calls Claude, persists report. Returns 502 gracefully if API key missing. |

#### B10 — End-to-end API verification ✅ — 32/32 PASSED
- `scripts/verify-phase-b.sh` runs every route as 4 different sessions (PL, Intern, QR, CEO) plus no-auth.
- Hit a stale dev cache issue during first run (Next.js webpack-api-runtime trying to require `./chunks/undefined`). **Fix:** stopped dev server, deleted `.next`, restarted. Common Next.js dev issue when new routes are added to a running server.
- Final result: all 32 assertions pass, including:
  - 401 on no-auth
  - 403 on Intern trying to POST task / change qrStatus / patch attendance / generate EOD
  - 403 on QR trying to generate EOD
  - 200 on PL/CEO listing projects (with correct content)
  - 201 on PL creating task
  - blockedSince set/cleared correctly on status transitions
  - qrReviewedBy populated when QR sets qrStatus
  - Metrics body has `velocity`, `forecast`, `workload` keys

#### B11 — Layout shell ✅
- `lib/nav.ts`: `NAV_BY_ROLE` map — 7 separate nav configs, one per role. PL gets 5 items, Executives 4, QL 3, QR 2, Intern 2.
- `components/layout/Sidebar.tsx`: 48px collapsed → 220px on hover (mouse-event width change, not just CSS, so labels actually fade in). EA brand chip top, active-item left bar (2px accent), sign-out + identity chip bottom.
- `components/layout/BottomNav.tsx`: mobile-only fixed bottom bar (sm: hidden). Renders the same nav items. Industry call over hamburger.
- `components/layout/DashboardLayout.tsx`: three-column shell (sidebar | content | right panel), with optional header slot and optional right panel slot. Pages opt-in to the right panel — only the PL home will use it initially.
- Stub dashboards updated to use the layout so the shell + sidebar render in all 5 role contexts.
- Build: 5 dashboards now ~285 B each (shared layout chunk holds the cost), middleware unchanged at 47.8 kB.

---

### Phase A — Foundation

#### A1 — Scaffold ✅ DONE
- Ran `create-next-app@14` with flags: TypeScript, Tailwind, ESLint, Pages Router (`--no-app`), no `src/` dir, `@/*` import alias, npm.
- Verified: `pages/` directory exists, no `app/` directory.
- Installed additional dependencies:
  - **Runtime:** `prisma`, `@prisma/client`, `next-auth@4`, `bcryptjs`, `@anthropic-ai/sdk`, `lucide-react`, `zod`, `react-hook-form`, `clsx`, `tailwind-merge`, `date-fns`
  - **Dev:** `@types/bcryptjs`, `tsx`
- Notes:
  - npm installed `prisma@7.x` and `@prisma/client@7.x` (latest). If v7 syntax differs from v6, address at A3.
  - `lucide-react@1.16.0` looks low — package may use unconventional versioning. Will verify import works during UI work.
  - 8 npm vulnerabilities (4 moderate, 4 high) — typical of fresh Next.js scaffold. Not addressing now; revisit before deploy.

#### A2 — Tailwind design system + Inter font + globals.css ✅ DONE
- Full token system in `tailwind.config.ts`: bg / border / text / accent / status color trees, type scale (meta/body/ui/section/stat/hero), letter-spacing tokens, radius (chip/button/card/modal), shadows (modal-only), keyframes (shimmer, slide-in-right, slide-up).
- `styles/globals.css`: dark base, autofill override (no white Chrome fill), custom scrollbar polish, `.bg-dot-grid` utility for the login background, `.skeleton` utility for the EOD loading state.
- `pages/_app.tsx`: Inter wired via `next/font/google` as CSS variable, SessionProvider wrapping all pages.
- `lib/cn.ts`: clsx + tailwind-merge helper.
- Verified clean `npm run build`.

#### A3 — Prisma schema + Docker Compose + migrate + seed ✅ DONE
- **Pivot:** npm installed Prisma v7 (latest), which broke the spec — v7 removed `url = env("DATABASE_URL")` from schema and moved it to `prisma.config.ts`. Downgraded to **Prisma 6.19.3** for stability and spec compatibility.
- **Pivot:** Postgres port 5432 was taken at container-start time (Docker race). Switched container to expose 5433 → mapped to 5432 inside container. `DATABASE_URL` updated in `.env`.
- **Pivot:** Merged `.env.local` → `.env` so Prisma CLI reads it natively without `dotenv-cli`. Updated `.gitignore` to ignore `.env` while still allowing `.env.example`.
- Schema additions over spec:
  - `Task.qrStatus QRStatus @default(PENDING)`
  - `Task.qrReviewedById String?` + relation `qrReviewedBy User?`
  - `Task.qrReviewedAt DateTime?`
  - `Task.blockedSince DateTime?` (set in API on transition into BLOCKED; cleared otherwise)
  - `Task.taskNumber Int @default(autoincrement())` (renders as `TSK-####`)
  - New enum `QRStatus { PENDING, APPROVED, REJECTED }`
  - Indexes on `Task.projectId`, `Task.assignedToId`, `Task.status`
- Migration `20260516144137_init` applied successfully.
- Seed populated: **7 users, 2 projects, 10 tasks, 10 memberships**. Aryan Sharma = PL, Rahul Verma = Intern (matches images).
- Realistic seed data: 3 blockers with varying `blockedSince` durations (4h, 1d, 2d) so PL dashboard renders "Blocked 4h/1d/2d" correctly; QR statuses mixed across tasks (some APPROVED, some REJECTED, some PENDING).

#### A4 — NextAuth (Credentials + Google) ✅ DONE
- `lib/auth.ts`: full authOptions with both providers. Credentials uses bcrypt compare against seeded users. Google only registers when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars are present.
- Type augmentation in `types/next-auth.d.ts`: `Session.user.id`, `Session.user.role`, `JWT.id`, `JWT.role`.
- JWT callback writes role to token; session callback reads role from token. Verified working via the verify-phase-a.sh script — all 7 roles' sessions contain the correct role.
- Google sign-in flow has a `signIn` callback that rejects Google users whose email isn't in the seed (so role can't be missing). When a seeded email matches, we override the user's `role` and `id` from the DB before the JWT is issued.

#### A5 — Middleware role-routing + `useRole` hook ✅ DONE
- `lib/roles.ts`: `ROLE_HOME`, `ROLE_PATHS`, `ROLE_LABELS` constants — single source of truth for role → URL mapping.
- `middleware.ts`: matches `/dashboard/:path*` and `/login`. Handles unauth dashboard access → login, auth login access → role home, auth dashboard access with wrong role → correct role home.
- `hooks/useRole.ts`: `useRole()` returns Role from session; `useCurrentUser()` returns full user + isLoading + isAuthenticated.

#### A6 — Login screen UI ✅ DONE
- `pages/login.tsx` — pixel-aligned to Image 1: dot-grid background, 400px max-width card on `bg.surface` with subtle border, 8px radius, 40px padding. Centered "Ethara AI" 20px/600 wordmark, "OPERATIONS INTELLIGENCE PLATFORM" subtitle in `text.secondary` 12px with 0.2em letter-spacing.
- Inputs: `bg.elevated`, `border.default`, 8px radius, focus state shifts border to `accent.primary` (no shadow halo). Label says **PASSCODE** (per image), maps to `password` field internally.
- Sign In: full-width, `accent.primary` bg, `accent.hover` on hover, 6px radius, 12px vertical padding, disabled+spinner during submission.
- Google button below the form, only renders when configured. "Don't have access? Request it." footer matches image.
- Mobile responsive: `min-h-screen flex items-center justify-center px-4 py-12`, card scales to full viewport width on mobile with 16px side padding.
- **Bonus for reviewer UX:** "Demo accounts" strip below the card with all 7 role labels. One click fills email + password — evaluator can switch roles instantly without retyping. Tucked under the card so it doesn't look toy-like.
- Server-side redirect via `getServerSideProps`: if already signed in, bounce to role home before rendering login.

#### A7 — Phase A verification gate ✅ DONE — 30/30 PASSED
- `scripts/verify-phase-a.sh` drives the full auth chain via curl for every seeded role.
- Asserted:
  - Unauth `GET /` → `/login` ✓
  - Unauth `GET /dashboard/pl` → `/login` ✓
  - For all 7 roles: credentials sign-in succeeds, `/api/auth/session` returns correct role, `/dashboard` root redirects to correct role home, authenticated `/login` bounces home, foreign-role dashboard access bounces to home, own-role dashboard returns 200.
- Stub dashboards at `/dashboard/{pl,executive,ql,qr,intern}` render the live session for visual verification.

---

## Open Items / Risks

- **Google OAuth credentials.** When user provides them, just paste into `.env` and the Google button auto-appears on the login screen. No code change needed.
- **`package.json#prisma` deprecation warning.** Prisma 6 still supports it; the warning says it'll be removed in v7. Can migrate to `prisma.config.ts` later — non-blocking.
- **Stub dashboards.** `/dashboard/{pl,executive,ql,qr,intern}` currently render a verification placeholder. Real UI ships in Phase C+. The `lucide-react@1.16` version concern is still untested — will surface during Phase C icon use.

---

## Verification Gates (don't skip)

- **End of A5:** Curl + browser-test all 7 logins.
- **End of B2:** Curl every API as 3 different roles.
- **End of C3:** Pixel diff PL dashboard vs Image 2.
- **End of D2:** Pixel diff Projects index + Project detail vs Images 3 + 4.
- **End of G2:** Live deployed URL — log in as all 7 roles, verify core flows.
