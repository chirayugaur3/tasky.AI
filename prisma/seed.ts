import { PrismaClient, Role, TaskStatus, TaskPriority, ProjectHealth, QRStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const SEED_PASSWORD = "ethara.ai";

// Ethara AI — "Reinforcement Learning as a Service for AGI"
// 13 users, 8 projects spanning RL infra, eval, alignment, agents.

type SeedUser = { email: string; name: string; role: Role; title: string };

const USERS: SeedUser[] = [
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

function daysAhead(n: number, hour = 14) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(hour, 0, 0, 0); return d;
}
function daysAgo(n: number, hour = 14) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, 0, 0, 0); return d;
}
function hoursAgo(n: number) { const d = new Date(); d.setHours(d.getHours() - n); return d; }

async function main() {
  // Idempotent: skip if data already exists (so prod deploys don't wipe state)
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`→ Database already seeded (${existing} users). Skipping.`);
    return;
  }

  console.log("→ Creating users…");
  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
  const users: Record<string, { id: string; name: string; email: string; role: Role; title: string | null }> = {};
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

  console.log("→ Creating projects (Ethara AI RL-as-a-Service portfolio)…");

  const rlhf = await prisma.project.create({
    data: {
      name: "Project Leviathan",
      description: "Training data pipeline for the Web Dev Agent — PRDs, reference assets, QC.",
      health: ProjectHealth.BLOCKED,
      deadline: daysAhead(2),
      projectLeadId: pl.id,
    },
  });

  const rewardSvc = await prisma.project.create({
    data: {
      name: "Project Sisyphus",
      description: "JS/TS profile audit for the SWE-smith bug-generation dataset.",
      health: ProjectHealth.AT_RISK,
      deadline: daysAhead(14),
      projectLeadId: pl.id,
    },
  });

  const ppo = await prisma.project.create({
    data: {
      name: "RLHF Training Pipeline v2",
      description: "Reward modeling drift fix in stage 3 of the PPO loop.",
      health: ProjectHealth.ON_TRACK,
      deadline: daysAhead(21),
      projectLeadId: pl.id,
    },
  });

  const dpo = await prisma.project.create({
    data: {
      name: "Atelier Noir Reference Library",
      description: "Gold-standard PRD library — Leviathan's canonical reference set.",
      health: ProjectHealth.ON_TRACK,
      deadline: daysAhead(28),
      projectLeadId: pl2.id,
    },
  });

  const agent = await prisma.project.create({
    data: {
      name: "Agent Tool-Use Benchmark",
      description: "Standardised tool-use eval — 47 environments, public leaderboard.",
      health: ProjectHealth.ON_TRACK,
      deadline: daysAhead(35),
      projectLeadId: pl2.id,
    },
  });

  const constitutional = await prisma.project.create({
    data: {
      name: "Constitutional AI Fine-tune",
      description: "Self-critique loop integration; alignment principle ingestion.",
      health: ProjectHealth.AT_RISK,
      deadline: daysAhead(10),
      projectLeadId: pl.id,
    },
  });

  const multimodal = await prisma.project.create({
    data: {
      name: "Multi-modal RL Curriculum",
      description: "Vision + language reward training on procedural tasks.",
      health: ProjectHealth.BLOCKED,
      deadline: daysAhead(5),
      projectLeadId: pl2.id,
    },
  });

  const safety = await prisma.project.create({
    data: {
      name: "Safety Red-Team Pipeline",
      description: "Automated adversarial probe runner pre-release.",
      health: ProjectHealth.ON_TRACK,
      deadline: daysAhead(45),
      projectLeadId: pl.id,
    },
  });

  console.log("→ Creating team memberships…");
  // Everyone in the org sits on RLHF (the hero project)
  for (const u of Object.values(users)) {
    await prisma.teamMember.create({
      data: { userId: u.id, projectId: rlhf.id, isPresent: u.email !== "ql@ethara.ai" },
    });
  }
  // Distribute the rest of the org across other projects
  const distributions: Array<[string, string[]]> = [
    [rewardSvc.id, [cto.id, tpm.id, intern1.id, intern2.id, qr1.id]],
    [ppo.id, [cto.id, tpm.id, intern2.id, intern3.id, qr1.id, ql.id]],
    [dpo.id, [tpm.id, ql.id, qr2.id, intern3.id, intern4.id]],
    [agent.id, [cto.id, intern4.id, intern5.id, qr2.id]],
    [constitutional.id, [cto.id, ql.id, qr1.id, intern5.id, intern1.id]],
    [multimodal.id, [tpm.id, intern2.id, intern4.id, qr2.id]],
    [safety.id, [cto.id, ql.id, qr1.id, qr2.id, intern3.id]],
  ];
  for (const [projectId, userIds] of distributions) {
    for (const userId of userIds) {
      await prisma.teamMember.create({ data: { userId, projectId, isPresent: true } });
    }
  }

  console.log("→ Creating tasks…");
  // ---- Project Leviathan (BLOCKED) — 7 tasks
  await prisma.task.create({
    data: {
      title: "QC Sweep — Submissions 140-152",
      description: "Full fidelity-to-source check on 13 new Leviathan packages.",
      status: TaskStatus.BLOCKED, priority: TaskPriority.HIGH,
      deadline: daysAhead(1, 16),
      blockerReason: "Awaiting vendor-side access to canonical reference sites.",
      blockedSince: daysAgo(2), qrStatus: QRStatus.PENDING,
      projectId: rlhf.id, assignedToId: cto.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Atelier Noir Asset Refresh",
      description: "Update reference multimedia for the canonical Leviathan PRD.",
      status: TaskStatus.BLOCKED, priority: TaskPriority.HIGH,
      deadline: daysAhead(2, 16),
      blockerReason: "Legal review pending on third-party logo licensing.",
      blockedSince: daysAgo(1), qrStatus: QRStatus.REJECTED,
      qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(6),
      projectId: rlhf.id, assignedToId: tpm.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "PRD Word-Count Validator",
      description: "Enforce 800–3500 word range on submission ingestion.",
      status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
      deadline: daysAhead(3, 14), qrStatus: QRStatus.PENDING,
      projectId: rlhf.id, assignedToId: intern1.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Review PR #442 — QC Verdict Format",
      status: TaskStatus.DONE, priority: TaskPriority.MEDIUM,
      deadline: daysAgo(1, 9), qrStatus: QRStatus.APPROVED,
      qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(3),
      projectId: rlhf.id, assignedToId: ql.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Multimedia Asset Slot Enforcer",
      description: "Reject submissions missing any of the 5 required asset slots.",
      status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(1, 11), qrStatus: QRStatus.APPROVED,
      qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(12),
      projectId: rlhf.id, assignedToId: intern2.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Submission Telemetry Export",
      status: TaskStatus.NOT_STARTED, priority: TaskPriority.LOW,
      deadline: daysAhead(2, 17), qrStatus: QRStatus.PENDING,
      projectId: rlhf.id, assignedToId: intern3.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "PRD Versioning Cleanup",
      status: TaskStatus.DONE, priority: TaskPriority.MEDIUM,
      deadline: daysAgo(2, 10), qrStatus: QRStatus.APPROVED,
      qrReviewedById: qr2.id, qrReviewedAt: daysAgo(1),
      projectId: rlhf.id, assignedToId: cto.id, createdById: pl.id,
    },
  });

  // ---- Project Sisyphus (AT_RISK) — 3 tasks
  await prisma.task.create({
    data: {
      title: "Express.js Profile Log Parser Broken",
      description: "Parser returns empty results on test outputs from latest Express release.",
      status: TaskStatus.BLOCKED, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(5, 15),
      blockerReason: "Upstream Express output format changed; need format spec from team.",
      blockedSince: hoursAgo(4), qrStatus: QRStatus.PENDING,
      projectId: rewardSvc.id, assignedToId: intern1.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Draft v0.4 Audit Report",
      status: TaskStatus.IN_PROGRESS, priority: TaskPriority.LOW,
      deadline: daysAhead(7, 17), qrStatus: QRStatus.PENDING,
      projectId: rewardSvc.id, assignedToId: intern2.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Webpack test_cmd Fix + Unit Tests",
      description: "Bug-validation failing on Webpack due to wrong test command.",
      status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(0, 14), qrStatus: QRStatus.PENDING,
      projectId: rewardSvc.id, assignedToId: intern1.id, createdById: pl.id,
    },
  });

  // ---- PPO Distributed (ON_TRACK) — 2 tasks
  await prisma.task.create({
    data: {
      title: "Implement DDP Gradient Bucketing",
      status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
      deadline: daysAhead(8, 12), qrStatus: QRStatus.PENDING,
      projectId: ppo.id, assignedToId: cto.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Profile NCCL All-Reduce Latency",
      status: TaskStatus.NOT_STARTED, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(12, 15), qrStatus: QRStatus.PENDING,
      projectId: ppo.id, assignedToId: intern3.id, createdById: pl.id,
    },
  });

  // ---- Constitutional AI (AT_RISK) — 2 tasks
  await prisma.task.create({
    data: {
      title: "Self-Critique Prompt Templates",
      status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
      deadline: daysAhead(4, 10), qrStatus: QRStatus.PENDING,
      projectId: constitutional.id, assignedToId: intern5.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Constitution Document v0.2",
      status: TaskStatus.BLOCKED, priority: TaskPriority.HIGH,
      deadline: daysAhead(3, 17), blockerReason: "Awaiting alignment principles review from policy team.",
      blockedSince: hoursAgo(18), qrStatus: QRStatus.PENDING,
      projectId: constitutional.id, assignedToId: ql.id, createdById: pl.id,
    },
  });

  // ---- Multimodal RL (BLOCKED) — 2 tasks
  await prisma.task.create({
    data: {
      title: "Vision Encoder Integration",
      status: TaskStatus.BLOCKED, priority: TaskPriority.HIGH,
      deadline: daysAhead(3, 11), blockerReason: "CLIP-L weights license review in progress with legal.",
      blockedSince: daysAgo(3), qrStatus: QRStatus.PENDING,
      projectId: multimodal.id, assignedToId: intern4.id, createdById: pl2.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Curriculum Difficulty Sampler",
      status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(6, 14), qrStatus: QRStatus.PENDING,
      projectId: multimodal.id, assignedToId: intern2.id, createdById: pl2.id,
    },
  });

  // ---- Atelier Noir Reference Library (ON_TRACK) — 4 tasks
  await prisma.task.create({
    data: {
      title: "Onboard 3 New Reference Sites", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(10, 12), qrStatus: QRStatus.PENDING,
      projectId: dpo.id, assignedToId: intern3.id, createdById: pl2.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Reference PRD Style Audit", status: TaskStatus.DONE, priority: TaskPriority.HIGH,
      deadline: daysAgo(2, 16), qrStatus: QRStatus.APPROVED,
      qrReviewedById: qr2.id, qrReviewedAt: daysAgo(1),
      projectId: dpo.id, assignedToId: ql.id, createdById: pl2.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Asset Pack Compression Pipeline", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(14, 11), qrStatus: QRStatus.PENDING,
      projectId: dpo.id, assignedToId: intern4.id, createdById: pl2.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Versioned Reference URL Index", status: TaskStatus.NOT_STARTED, priority: TaskPriority.LOW,
      deadline: daysAhead(20, 17), qrStatus: QRStatus.PENDING,
      projectId: dpo.id, assignedToId: tpm.id, createdById: pl2.id,
    },
  });

  // ---- Agent Tool-Use (ON_TRACK) — 4 tasks
  await prisma.task.create({
    data: {
      title: "Environment Sandbox v0.1", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
      deadline: daysAhead(7, 14), qrStatus: QRStatus.PENDING,
      projectId: agent.id, assignedToId: intern5.id, createdById: pl2.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Tool Registry Schema", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM,
      deadline: daysAgo(3, 10), qrStatus: QRStatus.APPROVED,
      qrReviewedById: qr2.id, qrReviewedAt: daysAgo(2),
      projectId: agent.id, assignedToId: cto.id, createdById: pl2.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Trajectory Scoring Rubric", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
      deadline: daysAhead(12, 15), qrStatus: QRStatus.PENDING,
      projectId: agent.id, assignedToId: intern4.id, createdById: pl2.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Public Leaderboard Frontend", status: TaskStatus.NOT_STARTED, priority: TaskPriority.LOW,
      deadline: daysAhead(25, 17), qrStatus: QRStatus.PENDING,
      projectId: agent.id, assignedToId: intern5.id, createdById: pl2.id,
    },
  });

  // ---- Safety Red-Team Pipeline (ON_TRACK) — 4 tasks
  await prisma.task.create({
    data: {
      title: "Adversarial Probe Catalogue", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
      deadline: daysAhead(9, 14), qrStatus: QRStatus.PENDING,
      projectId: safety.id, assignedToId: qr1.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Automated Jailbreak Detector", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
      deadline: daysAhead(15, 12), qrStatus: QRStatus.PENDING,
      projectId: safety.id, assignedToId: cto.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Refusal Rate Telemetry", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM,
      deadline: daysAgo(1, 16), qrStatus: QRStatus.APPROVED,
      qrReviewedById: qr1.id, qrReviewedAt: hoursAgo(8),
      projectId: safety.id, assignedToId: ql.id, createdById: pl.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Pre-Release Gate Documentation", status: TaskStatus.NOT_STARTED, priority: TaskPriority.LOW,
      deadline: daysAhead(30, 11), qrStatus: QRStatus.PENDING,
      projectId: safety.id, assignedToId: intern3.id, createdById: pl.id,
    },
  });

  const counts = await prisma.$transaction([
    prisma.user.count(), prisma.project.count(), prisma.task.count(), prisma.teamMember.count(),
  ]);
  console.log(`✓ Seed complete — ${counts[0]} users, ${counts[1]} projects, ${counts[2]} tasks, ${counts[3]} memberships.`);
  console.log(`✓ All logins use password: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
