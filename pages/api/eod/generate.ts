import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateEODReport } from "@/lib/eod";
import { fail, ok, parseBody, requireAuth, requireMethod, requireRole } from "@/lib/api";

const bodySchema = z.object({
  projectId: z.string(),
  context: z.string().max(4000),
  persist: z.boolean().optional().default(true),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["POST"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  // Spec: PL only.
  if (!requireRole(res, session, [Role.PROJECT_LEAD])) return;

  const body = parseBody(res, bodySchema, req.body);
  if (!body) return;

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
  });
  if (!project) return fail(res, "Project not found", 404);
  if (project.projectLeadId !== session.user.id) {
    return fail(res, "Forbidden — you are not this project's lead", 403);
  }

  // Telemetry window = last 24h
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const tasks = await prisma.task.findMany({
    where: { projectId: body.projectId },
    select: {
      title: true,
      status: true,
      blockerReason: true,
      updatedAt: true,
    },
  });

  const completed = tasks
    .filter((t) => t.status === TaskStatus.DONE && t.updatedAt >= since)
    .map((t) => t.title);
  const inProgress = tasks
    .filter((t) => t.status === TaskStatus.IN_PROGRESS)
    .map((t) => t.title);
  const blocked = tasks
    .filter((t) => t.status === TaskStatus.BLOCKED)
    .map((t) => ({ task: t.title, reason: t.blockerReason ?? "no reason provided" }));

  let report;
  try {
    report = await generateEODReport(body.context, {
      completed,
      inProgress,
      blocked,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Claude call failed";
    return fail(res, msg, 502);
  }

  let saved = null;
  if (body.persist) {
    saved = await prisma.eODReport.create({
      data: {
        context: body.context,
        generatedReport: JSON.stringify(report),
        projectLeadId: session.user.id,
        projectId: body.projectId,
      },
    });
  }

  return ok(res, {
    report,
    telemetry: { completedCount: completed.length, inProgressCount: inProgress.length, blockedCount: blocked.length },
    persistedId: saved?.id ?? null,
  });
}
