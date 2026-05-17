import type { NextApiRequest, NextApiResponse } from "next";
import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireAuth, requireMethod } from "@/lib/api";

/**
 * GET /api/tasks/velocity
 * Returns the last 7 days of completed-task counts for the caller's scope.
 * - PROJECT_LEAD: tasks within projects they lead
 * - executives / quality_lead / qr: all tasks
 * - intern: their assigned tasks only
 *
 * Shape: [{ date: "YYYY-MM-DD", completedCount: number }, ...]
 * Ordered oldest → newest.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  const role = session.user.role;
  const userId = session.user.id;

  // 7-day window, anchored at the start of "today" so each bucket = one calendar day.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const windowStart = new Date(startOfToday);
  windowStart.setDate(windowStart.getDate() - 6); // include today + previous 6 days

  // Scope filter
  let where: Record<string, unknown>;
  if (role === Role.PROJECT_LEAD) {
    const ledProjects = await prisma.project.findMany({
      where: { projectLeadId: userId },
      select: { id: true },
    });
    where = {
      projectId: { in: ledProjects.map((p) => p.id) },
      status: TaskStatus.DONE,
      updatedAt: { gte: windowStart },
    };
  } else if (role === Role.INTERN) {
    where = {
      assignedToId: userId,
      status: TaskStatus.DONE,
      updatedAt: { gte: windowStart },
    };
  } else if (
    role === Role.CEO ||
    role === Role.CTO ||
    role === Role.TPM ||
    role === Role.QUALITY_LEAD ||
    role === Role.QR
  ) {
    where = { status: TaskStatus.DONE, updatedAt: { gte: windowStart } };
  } else {
    return fail(res, "Forbidden", 403);
  }

  const completed = await prisma.task.findMany({
    where,
    select: { updatedAt: true },
  });

  // Bucket into 7 day-keys
  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    buckets.set(toDayKey(d), 0);
  }
  for (const t of completed) {
    const k = toDayKey(t.updatedAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }

  const series = Array.from(buckets.entries()).map(([date, completedCount]) => ({
    date,
    completedCount,
  }));

  return ok(res, series);
}

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
