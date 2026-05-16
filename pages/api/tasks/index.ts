import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseBody, requireAuth, requireMethod, requireRole } from "@/lib/api";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  projectId: z.string(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).optional(),
  assignedToId: z.string().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
});

const EXECUTIVE_ROLES: Role[] = [Role.CEO, Role.CTO, Role.TPM];
const TASK_CREATE_ROLES: Role[] = [
  Role.PROJECT_LEAD,
  Role.QUALITY_LEAD,
  ...EXECUTIVE_ROLES,
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET", "POST"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    const projectId =
      typeof req.query.projectId === "string" ? req.query.projectId : undefined;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    // Interns only see their own tasks.
    if (session.user.role === Role.INTERN) {
      where.assignedToId = session.user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { deadline: "asc" }, { taskNumber: "desc" }],
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true } },
        qrReviewedBy: { select: { id: true, name: true } },
      },
    });

    return ok(res, tasks);
  }

  // POST — create task
  if (!requireRole(res, session, TASK_CREATE_ROLES)) return;

  const body = parseBody(res, createSchema, req.body);
  if (!body) return;

  // Project must exist; PL can only create tasks on their own projects.
  const project = await prisma.project.findUnique({ where: { id: body.projectId } });
  if (!project) return fail(res, "Project not found", 404);

  if (
    session.user.role === Role.PROJECT_LEAD &&
    project.projectLeadId !== session.user.id
  ) {
    return fail(res, "Forbidden — you are not this project's lead", 403);
  }

  // Validate assignee exists if provided.
  if (body.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: body.assignedToId },
    });
    if (!assignee) return fail(res, "Assigned user not found", 404);
  }

  const initialStatus = body.status ?? TaskStatus.NOT_STARTED;
  const created = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      projectId: body.projectId,
      priority: body.priority,
      status: initialStatus,
      assignedToId: body.assignedToId,
      deadline: body.deadline ? new Date(body.deadline) : null,
      createdById: session.user.id,
      blockedSince: initialStatus === TaskStatus.BLOCKED ? new Date() : null,
    },
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return ok(res, created, 201);
}
