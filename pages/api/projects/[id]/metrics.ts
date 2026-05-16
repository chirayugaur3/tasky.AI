import type { NextApiRequest, NextApiResponse } from "next";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireAuth, requireMethod } from "@/lib/api";

const EXECUTIVE_ROLES: Role[] = [Role.CEO, Role.CTO, Role.TPM];

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  HIGH: 1.5,
  MEDIUM: 1.0,
  LOW: 0.7,
};

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDayUTC(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  const projectId = String(req.query.id);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      teamMembers: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!project) return fail(res, "Project not found", 404);

  // Access control: same as project detail.
  const isExecutive = EXECUTIVE_ROLES.includes(session.user.role);
  const isLead = project.projectLeadId === session.user.id;
  const isMember = project.teamMembers.some((m) => m.userId === session.user.id);
  if (!isExecutive && !isLead && !isMember) {
    return fail(res, "Forbidden — not a member of this project", 403);
  }

  // --- Velocity (this week vs last week) ---
  const now = new Date();
  const oneWeekAgo = daysFromNow(-7);
  const twoWeeksAgo = daysFromNow(-14);

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.task.count({
      where: {
        projectId,
        status: TaskStatus.DONE,
        updatedAt: { gte: oneWeekAgo, lte: now },
      },
    }),
    prisma.task.count({
      where: {
        projectId,
        status: TaskStatus.DONE,
        updatedAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    }),
  ]);

  // --- Forecast (simple linear projection) ---
  const allTasks = await prisma.task.findMany({
    where: { projectId },
    select: { status: true, assignedToId: true, priority: true },
  });
  const total = allTasks.length;
  const done = allTasks.filter((t) => t.status === TaskStatus.DONE).length;
  const remaining = total - done;
  const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);

  let confidence80: Date | null = null;
  let confidence95: Date | null = null;
  if (remaining === 0) {
    confidence80 = startOfDayUTC(now);
    confidence95 = startOfDayUTC(now);
  } else {
    const weeklyVelocity = Math.max(thisWeek, 1);
    const weeksTo80 = remaining / weeklyVelocity;
    const weeksTo95 = weeksTo80 * 1.2; // 20% buffer
    confidence80 = startOfDayUTC(daysFromNow(Math.ceil(weeksTo80 * 7)));
    confidence95 = startOfDayUTC(daysFromNow(Math.ceil(weeksTo95 * 7)));
  }

  // --- Workload per team member ---
  // Open = not DONE. Weight by priority. 12.5% per "task unit". Cap 100%.
  const workload = project.teamMembers.map((m) => {
    const userTasks = allTasks.filter(
      (t) => t.assignedToId === m.userId && t.status !== TaskStatus.DONE
    );
    const units = userTasks.reduce(
      (sum, t) => sum + PRIORITY_WEIGHT[t.priority],
      0
    );
    const pct = Math.min(100, Math.round(units * 12.5));
    return {
      userId: m.userId,
      name: m.user.name,
      role: m.user.role,
      isPresent: m.isPresent,
      openTaskCount: userTasks.length,
      workloadPct: pct,
    };
  });

  // --- Days left (calendar) ---
  const msPerDay = 1000 * 60 * 60 * 24;
  const deadlineDate = new Date(project.deadline);
  const daysLeft = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / msPerDay
  );

  return ok(res, {
    projectId,
    completion: { total, done, remaining, pct: completionPct },
    velocity: { thisWeek, lastWeek, trend: thisWeek - lastWeek },
    forecast: { confidence80, confidence95 },
    daysLeft,
    workload,
  });
}
