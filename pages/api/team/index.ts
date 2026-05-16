import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseBody, requireAuth, requireMethod } from "@/lib/api";

const patchSchema = z.object({
  userId: z.string(),
  projectId: z.string(),
  isPresent: z.boolean(),
});

const postSchema = z.object({
  projectId: z.string(),
  userIds: z.array(z.string().min(1)).min(1),
});

const EXECUTIVE_ROLES: Role[] = [Role.CEO, Role.CTO, Role.TPM];
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  HIGH: 1.5,
  MEDIUM: 1.0,
  LOW: 0.7,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET", "POST", "PATCH"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    const projectId =
      typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    if (!projectId) return fail(res, "projectId query param is required", 400);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, title: true } },
          },
        },
      },
    });
    if (!project) return fail(res, "Project not found", 404);

    // Authorization
    const isExec = EXECUTIVE_ROLES.includes(session.user.role);
    const isLead = project.projectLeadId === session.user.id;
    const isMember = project.teamMembers.some((m) => m.userId === session.user.id);
    if (!isExec && !isLead && !isMember) {
      return fail(res, "Forbidden — not a member of this project", 403);
    }

    // Pull all open tasks for this project to compute workload + current task.
    const openTasks = await prisma.task.findMany({
      where: { projectId, status: { not: TaskStatus.DONE } },
      orderBy: [{ status: "asc" }, { deadline: "asc" }],
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assignedToId: true,
      },
    });

    const members = project.teamMembers.map((m) => {
      const userTasks = openTasks.filter((t) => t.assignedToId === m.userId);
      const units = userTasks.reduce(
        (sum, t) => sum + PRIORITY_WEIGHT[t.priority],
        0
      );
      const workloadPct = m.isPresent ? Math.min(100, Math.round(units * 12.5)) : 0;
      const currentTask = userTasks.find(
        (t) => t.status === TaskStatus.IN_PROGRESS
      ) ?? userTasks[0];

      return {
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.user.role,
        title: m.user.title,
        isPresent: m.isPresent,
        currentTask: currentTask
          ? { id: currentTask.id, title: currentTask.title, status: currentTask.status }
          : null,
        taskCount: userTasks.length,
        workloadPct,
      };
    });

    const presentCount = members.filter((m) => m.isPresent).length;
    const absentCount = members.length - presentCount;
    const avgWorkload =
      members.length === 0
        ? 0
        : Math.round(
            members.reduce((s, m) => s + m.workloadPct, 0) / members.length
          );
    const blockedMembers = openTasks
      .filter((t) => t.status === TaskStatus.BLOCKED)
      .reduce(
        (set, t) => (t.assignedToId ? set.add(t.assignedToId) : set),
        new Set<string>()
      ).size;

    return ok(res, {
      members,
      stats: {
        present: presentCount,
        absent: absentCount,
        avgWorkload,
        tasksActive: openTasks.length,
        blockedMembers,
      },
    });
  }

  if (req.method === "POST") {
    const body = parseBody(res, postSchema, req.body);
    if (!body) return;

    const project = await prisma.project.findUnique({ where: { id: body.projectId } });
    if (!project) return fail(res, "Project not found", 404);

    const role = session.user.role;
    if (role === Role.PROJECT_LEAD) {
      if (project.projectLeadId !== session.user.id) {
        return fail(res, "Forbidden — you are not this project's lead", 403);
      }
    } else if (!EXECUTIVE_ROLES.includes(role)) {
      return fail(res, "Forbidden — insufficient role to add team members", 403);
    }

    // Skip users already on the project.
    const existing = await prisma.teamMember.findMany({
      where: { projectId: body.projectId, userId: { in: body.userIds } },
      select: { userId: true },
    });
    const existingSet = new Set(existing.map((m) => m.userId));
    const toAdd = body.userIds.filter((id) => !existingSet.has(id));

    if (toAdd.length === 0) return ok(res, { added: 0, members: [] });

    const created = await prisma.$transaction(
      toAdd.map((userId) =>
        prisma.teamMember.create({
          data: { userId, projectId: body.projectId, isPresent: true },
        })
      )
    );
    return ok(res, { added: created.length, members: created }, 201);
  }

  // PATCH — only PL of project or executives can change attendance
  const body = parseBody(res, patchSchema, req.body);
  if (!body) return;

  const project = await prisma.project.findUnique({ where: { id: body.projectId } });
  if (!project) return fail(res, "Project not found", 404);

  const role = session.user.role;
  if (role === Role.PROJECT_LEAD) {
    if (project.projectLeadId !== session.user.id) {
      return fail(res, "Forbidden — you are not this project's lead", 403);
    }
  } else if (!EXECUTIVE_ROLES.includes(role)) {
    return fail(res, "Forbidden — insufficient role to change attendance", 403);
  }

  const updated = await prisma.teamMember.update({
    where: { userId_projectId: { userId: body.userId, projectId: body.projectId } },
    data: { isPresent: body.isPresent },
  });
  return ok(res, updated);
}
