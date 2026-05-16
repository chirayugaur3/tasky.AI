import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Role, TaskStatus, TaskPriority, ProjectHealth, QRStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// One-shot DB seeder. Schema is pushed by `prisma migrate deploy` during the Vercel build.
// Idempotent — subsequent calls skip seeding if users already exist.
//
// Usage:  curl -X POST "https://<your-app>.vercel.app/api/admin/init?secret=tasky-init-2026"

const INIT_SECRET = process.env.INIT_SECRET ?? "tasky-init-2026";
const SEED_PASSWORD = "ethara.ai";

function daysAhead(n: number, hour = 14) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(hour, 0, 0, 0); return d;
}
function daysAgo(n: number, hour = 14) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, 0, 0, 0); return d;
}
function hoursAgo(n: number) { const d = new Date(); d.setHours(d.getHours() - n); return d; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "POST or GET only" });
  }
  const secret = (req.query.secret as string) ?? req.headers["x-init-secret"];
  if (secret !== INIT_SECRET) {
    return res.status(401).json({ error: "Invalid or missing secret" });
  }

  const log: string[] = [];

  try {
    // Step 1: Check database access (assuming schema is pushed during Vercel build)
    log.push("→ Checking database connection...");
    await prisma.$connect();
    log.push("✓ Database connected");
  } catch (e) {
    log.push(`Database connection failed: ${e instanceof Error ? e.message : String(e)}`);
    return res.status(500).json({ data: null, error: "Database connection failed", log, status: 500 });
  }

  // Step 2: idempotent seed
  try {
    const existing = await prisma.user.count();
    if (existing > 0) {
      log.push(`→ ${existing} users already exist. Skipping seed.`);
      return res.status(200).json({
        data: { seeded: false, users: existing },
        error: null,
        log,
        status: 200,
      });
    }

    log.push("→ Seeding…");
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

    const USERS = [
      { email: "ceo@ethara.ai", name: "Sanjay Kapoor", role: Role.CEO, title: "Chief Executive Officer" },
      { email: "cto@ethara.ai", name: "Priya Nair", role: Role.CTO, title: "Chief Technology Officer" },
      { email: "tpm@ethara.ai", name: "Rohan Mehta", role: Role.TPM, title: "Technical Program Manager" },
      { email: "pl@ethara.ai", name: "Aryan Sharma", role: Role.PROJECT_LEAD, title: "Lead, RL Infrastructure" },
      { email: "pl2@ethara.ai", name: "Maya Krishnan", role: Role.PROJECT_LEAD, title: "Lead, Evaluation" },
      { email: "ql@ethara.ai", name: "Vikram Patel", role: Role.QUALITY_LEAD, title: "Head of ML Eval" },
      { email: "qr@ethara.ai", name: "Kira Lin", role: Role.QR, title: "Senior ML Researcher" },
      { email: "qr2@ethara.ai", name: "Daniel Brooks", role: Role.QR, title: "ML Researcher" },
      { email: "intern@ethara.ai", name: "Rahul Verma", role: Role.INTERN, title: "Software Engineer" },
      { email: "intern2@ethara.ai", name: "Ananya Iyer", role: Role.INTERN, title: "ML Engineer" },
      { email: "intern3@ethara.ai", name: "Marcus Johnson", role: Role.INTERN, title: "Research Engineer" },
      { email: "intern4@ethara.ai", name: "Sofia Chen", role: Role.INTERN, title: "Engineering Intern" },
      { email: "intern5@ethara.ai", name: "Diego Lopez", role: Role.INTERN, title: "Research Intern" },
    ];

    const users: Record<string, { id: string }> = {};
    for (const u of USERS) {
      const created = await prisma.user.create({ data: { ...u, password: hashedPassword } });
      users[u.email] = created;
    }
    const pl = users["pl@ethara.ai"];
    const pl2 = users["pl2@ethara.ai"];
    const cto = users["cto@ethara.ai"];
    const tpm = users["tpm@ethara.ai"];
    const ql = users["ql@ethara.ai"];
    const qr1 = users["qr@ethara.ai"];
    const qr2 = users["qr2@ethara.ai"];
    const intern1 = users["intern@ethara.ai"];
    const intern2 = users["intern2@ethara.ai"];
    const intern3 = users["intern3@ethara.ai"];
    const intern4 = users["intern4@ethara.ai"];
    const intern5 = users["intern5@ethara.ai"];

    const leviathan = await prisma.project.create({ data: { name: "Project Leviathan", description: "Training data pipeline for the Web Dev Agent — PRDs, reference assets, QC.", health: ProjectHealth.BLOCKED, deadline: daysAhead(2), projectLeadId: pl.id } });
    const sisyphus = await prisma.project.create({ data: { name: "Project Sisyphus", description: "JS/TS profile audit for the SWE-smith bug-generation dataset.", health: ProjectHealth.AT_RISK, deadline: daysAhead(14), projectLeadId: pl.id } });
    const rlhf = await prisma.project.create({ data: { name: "RLHF Training Pipeline v2", description: "Reward modeling drift fix in stage 3 of the PPO loop.", health: ProjectHealth.ON_TRACK, deadline: daysAhead(21), projectLeadId: pl.id } });
    const atelier = await prisma.project.create({ data: { name: "Atelier Noir Reference Library", description: "Gold-standard PRD library — Leviathan's canonical reference set.", health: ProjectHealth.ON_TRACK, deadline: daysAhead(28), projectLeadId: pl2.id } });
    const agent = await prisma.project.create({ data: { name: "Agent Tool-Use Benchmark", description: "Standardised tool-use eval — 47 environments, public leaderboard.", health: ProjectHealth.ON_TRACK, deadline: daysAhead(35), projectLeadId: pl2.id } });
    const constitutional = await prisma.project.create({ data: { name: "Constitutional AI Fine-tune", description: "Self-critique loop integration; alignment principle ingestion.", health: ProjectHealth.AT_RISK, deadline: daysAhead(10), projectLeadId: pl.id } });
    const multimodal = await prisma.project.create({ data: { name: "Multi-modal RL Curriculum", description: "Vision + language reward training on procedural tasks.", health: ProjectHealth.BLOCKED, deadline: daysAhead(5), projectLeadId: pl2.id } });
    const safety = await prisma.project.create({ data: { name: "Safety Red-Team Pipeline", description: "Automated adversarial probe runner pre-release.", health: ProjectHealth.ON_TRACK, deadline: daysAhead(45), projectLeadId: pl.id } });

    // Memberships
    for (const u of Object.values(users)) {
      await prisma.teamMember.create({ data: { userId: u.id, projectId: leviathan.id, isPresent: u.id !== ql.id } });
    }
    const dist: Array<[string, string[]]> = [
      [sisyphus.id, [cto.id, tpm.id, intern1.id, intern2.id, qr1.id]],
      [rlhf.id, [cto.id, tpm.id, intern2.id, intern3.id, qr1.id, ql.id]],
      [atelier.id, [tpm.id, ql.id, qr2.id, intern3.id, intern4.id]],
      [agent.id, [cto.id, intern4.id, intern5.id, qr2.id]],
      [constitutional.id, [cto.id, ql.id, qr1.id, intern5.id, intern1.id]],
      [multimodal.id, [tpm.id, intern2.id, intern4.id, qr2.id]],
      [safety.id, [cto.id, ql.id, qr1.id, qr2.id, intern3.id]],
    ];
    for (const [pid, uids] of dist) for (const uid of uids) await prisma.teamMember.create({ data: { userId: uid, projectId: pid, isPresent: true } });

    // Tasks
    const T = TaskStatus, P = TaskPriority, Q = QRStatus;
    const taskData = [
      // Leviathan
      { title: "QC Sweep — Submissions 140-152", description: "Full fidelity-to-source check on 13 new Leviathan packages.", status: T.BLOCKED, priority: P.HIGH, deadline: daysAhead(1, 16), blockerReason: "Awaiting vendor-side access to canonical reference sites.", blockedSince: daysAgo(2), qrStatus: Q.PENDING, projectId: leviathan.id, assignedToId: cto.id, createdById: pl.id },
      { title: "Atelier Noir Asset Refresh", description: "Update reference multimedia for the canonical Leviathan PRD.", status: T.BLOCKED, priority: P.HIGH, deadline: daysAhead(2, 16), blockerReason: "Legal review pending on third-party logo licensing.", blockedSince: daysAgo(1), qrStatus: Q.REJECTED, qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(6), projectId: leviathan.id, assignedToId: tpm.id, createdById: pl.id },
      { title: "PRD Word-Count Validator", description: "Enforce 800–3500 word range on submission ingestion.", status: T.IN_PROGRESS, priority: P.HIGH, deadline: daysAhead(3, 14), qrStatus: Q.PENDING, projectId: leviathan.id, assignedToId: intern1.id, createdById: pl.id },
      { title: "Review PR #442 — QC Verdict Format", status: T.DONE, priority: P.MEDIUM, deadline: daysAgo(1, 9), qrStatus: Q.APPROVED, qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(3), projectId: leviathan.id, assignedToId: ql.id, createdById: pl.id },
      { title: "Multimedia Asset Slot Enforcer", description: "Reject submissions missing any of the 5 required asset slots.", status: T.IN_PROGRESS, priority: P.MEDIUM, deadline: daysAhead(1, 11), qrStatus: Q.APPROVED, qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(12), projectId: leviathan.id, assignedToId: intern2.id, createdById: pl.id },
      { title: "Submission Telemetry Export", status: T.NOT_STARTED, priority: P.LOW, deadline: daysAhead(2, 17), qrStatus: Q.PENDING, projectId: leviathan.id, assignedToId: intern3.id, createdById: pl.id },
      { title: "PRD Versioning Cleanup", status: T.DONE, priority: P.MEDIUM, deadline: daysAgo(2, 10), qrStatus: Q.APPROVED, qrReviewedById: qr2.id, qrReviewedAt: daysAgo(1), projectId: leviathan.id, assignedToId: cto.id, createdById: pl.id },
      // Sisyphus
      { title: "Express.js Profile Log Parser Broken", description: "Parser returns empty results on test outputs from latest Express release.", status: T.BLOCKED, priority: P.MEDIUM, deadline: daysAhead(5, 15), blockerReason: "Upstream Express output format changed; need format spec from team.", blockedSince: hoursAgo(4), qrStatus: Q.PENDING, projectId: sisyphus.id, assignedToId: intern1.id, createdById: pl.id },
      { title: "Draft v0.4 Audit Report", status: T.IN_PROGRESS, priority: P.LOW, deadline: daysAhead(7, 17), qrStatus: Q.PENDING, projectId: sisyphus.id, assignedToId: intern2.id, createdById: pl.id },
      { title: "Webpack test_cmd Fix + Unit Tests", description: "Bug-validation failing on Webpack due to wrong test command.", status: T.IN_PROGRESS, priority: P.MEDIUM, deadline: daysAhead(0, 14), qrStatus: Q.PENDING, projectId: sisyphus.id, assignedToId: intern1.id, createdById: pl.id },
      // RLHF
      { title: "Implement DDP Gradient Bucketing", status: T.IN_PROGRESS, priority: P.HIGH, deadline: daysAhead(8, 12), qrStatus: Q.PENDING, projectId: rlhf.id, assignedToId: cto.id, createdById: pl.id },
      { title: "Profile NCCL All-Reduce Latency", status: T.NOT_STARTED, priority: P.MEDIUM, deadline: daysAhead(12, 15), qrStatus: Q.PENDING, projectId: rlhf.id, assignedToId: intern3.id, createdById: pl.id },
      // Constitutional
      { title: "Self-Critique Prompt Templates", status: T.IN_PROGRESS, priority: P.HIGH, deadline: daysAhead(4, 10), qrStatus: Q.PENDING, projectId: constitutional.id, assignedToId: intern5.id, createdById: pl.id },
      { title: "Constitution Document v0.2", status: T.BLOCKED, priority: P.HIGH, deadline: daysAhead(3, 17), blockerReason: "Awaiting alignment principles review from policy team.", blockedSince: hoursAgo(18), qrStatus: Q.PENDING, projectId: constitutional.id, assignedToId: ql.id, createdById: pl.id },
      // Multimodal
      { title: "Vision Encoder Integration", status: T.BLOCKED, priority: P.HIGH, deadline: daysAhead(3, 11), blockerReason: "CLIP-L weights license review in progress with legal.", blockedSince: daysAgo(3), qrStatus: Q.PENDING, projectId: multimodal.id, assignedToId: intern4.id, createdById: pl2.id },
      { title: "Curriculum Difficulty Sampler", status: T.IN_PROGRESS, priority: P.MEDIUM, deadline: daysAhead(6, 14), qrStatus: Q.PENDING, projectId: multimodal.id, assignedToId: intern2.id, createdById: pl2.id },
      // Atelier Noir
      { title: "Onboard 3 New Reference Sites", status: T.IN_PROGRESS, priority: P.MEDIUM, deadline: daysAhead(10, 12), qrStatus: Q.PENDING, projectId: atelier.id, assignedToId: intern3.id, createdById: pl2.id },
      { title: "Reference PRD Style Audit", status: T.DONE, priority: P.HIGH, deadline: daysAgo(2, 16), qrStatus: Q.APPROVED, qrReviewedById: qr2.id, qrReviewedAt: daysAgo(1), projectId: atelier.id, assignedToId: ql.id, createdById: pl2.id },
      { title: "Asset Pack Compression Pipeline", status: T.IN_PROGRESS, priority: P.MEDIUM, deadline: daysAhead(14, 11), qrStatus: Q.PENDING, projectId: atelier.id, assignedToId: intern4.id, createdById: pl2.id },
      { title: "Versioned Reference URL Index", status: T.NOT_STARTED, priority: P.LOW, deadline: daysAhead(20, 17), qrStatus: Q.PENDING, projectId: atelier.id, assignedToId: tpm.id, createdById: pl2.id },
      // Agent
      { title: "Environment Sandbox v0.1", status: T.IN_PROGRESS, priority: P.HIGH, deadline: daysAhead(7, 14), qrStatus: Q.PENDING, projectId: agent.id, assignedToId: intern5.id, createdById: pl2.id },
      { title: "Tool Registry Schema", status: T.DONE, priority: P.MEDIUM, deadline: daysAgo(3, 10), qrStatus: Q.APPROVED, qrReviewedById: qr2.id, qrReviewedAt: daysAgo(2), projectId: agent.id, assignedToId: cto.id, createdById: pl2.id },
      { title: "Trajectory Scoring Rubric", status: T.IN_PROGRESS, priority: P.MEDIUM, deadline: daysAhead(12, 15), qrStatus: Q.PENDING, projectId: agent.id, assignedToId: intern4.id, createdById: pl2.id },
      { title: "Public Leaderboard Frontend", status: T.NOT_STARTED, priority: P.LOW, deadline: daysAhead(25, 17), qrStatus: Q.PENDING, projectId: agent.id, assignedToId: intern5.id, createdById: pl2.id },
      // Safety
      { title: "Adversarial Probe Catalogue", status: T.IN_PROGRESS, priority: P.HIGH, deadline: daysAhead(9, 14), qrStatus: Q.PENDING, projectId: safety.id, assignedToId: qr1.id, createdById: pl.id },
      { title: "Automated Jailbreak Detector", status: T.IN_PROGRESS, priority: P.HIGH, deadline: daysAhead(15, 12), qrStatus: Q.PENDING, projectId: safety.id, assignedToId: cto.id, createdById: pl.id },
      { title: "Refusal Rate Telemetry", status: T.DONE, priority: P.MEDIUM, deadline: daysAgo(1, 16), qrStatus: Q.APPROVED, qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(8), projectId: safety.id, assignedToId: ql.id, createdById: pl.id },
      { title: "Pre-Release Gate Documentation", status: T.NOT_STARTED, priority: P.LOW, deadline: daysAhead(30, 11), qrStatus: Q.PENDING, projectId: safety.id, assignedToId: intern3.id, createdById: pl.id },
    ];
    for (const t of taskData) await prisma.task.create({ data: t });

    const counts = await prisma.$transaction([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.teamMember.count(),
    ]);
    log.push(`✓ Seeded ${counts[0]} users, ${counts[1]} projects, ${counts[2]} tasks, ${counts[3]} memberships.`);

    return res.status(200).json({
      data: { seeded: true, users: counts[0], projects: counts[1], tasks: counts[2], memberships: counts[3] },
      error: null,
      log,
      status: 200,
    });
  } catch (e) {
    return res.status(500).json({
      data: null,
      error: e instanceof Error ? e.message : "Seed failed",
      log,
      status: 500,
    });
  }
}
