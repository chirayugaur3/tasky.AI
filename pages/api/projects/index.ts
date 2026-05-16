import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Role, ProjectHealth, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseBody, requireAuth, requireMethod, requireRole } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  deadline: z.string().datetime(),
  health: z.nativeEnum(ProjectHealth).optional(),
  projectLeadId: z.string().optional(),
});

const EXECUTIVE_ROLES: Role[] = [Role.CEO, Role.CTO, Role.TPM];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET", "POST"])) return;

  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    const isExecutive = EXECUTIVE_ROLES.includes(session.user.role);

    const projects = await prisma.project.findMany({
      where: isExecutive
        ? undefined
        : {
            OR: [
              { projectLeadId: session.user.id },
              { teamMembers: { some: { userId: session.user.id } } },
            ],
          },
      include: {
        projectLead: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { deadline: "asc" },
    });

    const enriched = projects.map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
      const blocked = p.tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
      const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        health: p.health,
        deadline: p.deadline,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        projectLead: p.projectLead,
        taskCount: total,
        doneCount: done,
        blockedCount: blocked,
        completionPct,
      };
    });

    return ok(res, enriched);
  }

  // POST — create project
  if (!requireRole(res, session, [Role.PROJECT_LEAD, ...EXECUTIVE_ROLES])) return;

  const body = parseBody(res, createSchema, req.body);
  if (!body) return;

  // If a non-exec PL creates a project, they become the lead unless they override.
  const projectLeadId =
    body.projectLeadId ??
    (session.user.role === Role.PROJECT_LEAD ? session.user.id : undefined);

  if (!projectLeadId) {
    return fail(res, "projectLeadId is required when creating as an executive", 400);
  }

  // Confirm the lead exists and actually has PROJECT_LEAD role.
  const lead = await prisma.user.findUnique({ where: { id: projectLeadId } });
  if (!lead) return fail(res, "Project lead not found", 404);
  if (lead.role !== Role.PROJECT_LEAD)
    return fail(res, "Assigned lead must have PROJECT_LEAD role", 400);

  const created = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      deadline: new Date(body.deadline),
      health: body.health ?? ProjectHealth.ON_TRACK,
      projectLeadId,
      // Project lead is automatically a team member.
      teamMembers: { create: { userId: projectLeadId } },
    },
  });

  return ok(res, created, 201);
}
