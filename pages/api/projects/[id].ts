import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Role, ProjectHealth } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseBody, requireAuth, requireMethod, requireRole } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  deadline: z.string().datetime().optional(),
  health: z.nativeEnum(ProjectHealth).optional(),
  projectLeadId: z.string().optional(),
});

const EXECUTIVE_ROLES: Role[] = [Role.CEO, Role.CTO, Role.TPM];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET", "PATCH", "DELETE"])) return;

  const session = await requireAuth(req, res);
  if (!session) return;

  const id = String(req.query.id);

  if (req.method === "GET") {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        projectLead: { select: { id: true, name: true, email: true, role: true } },
        tasks: {
          orderBy: [{ status: "asc" }, { deadline: "asc" }],
          include: {
            assignedTo: { select: { id: true, name: true, email: true, role: true } },
            createdBy: { select: { id: true, name: true } },
            qrReviewedBy: { select: { id: true, name: true } },
          },
        },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!project) return fail(res, "Project not found", 404);

    // Authorization: executives see all; others must be lead or member.
    const isExecutive = EXECUTIVE_ROLES.includes(session.user.role);
    const isLead = project.projectLeadId === session.user.id;
    const isMember = project.teamMembers.some((m) => m.userId === session.user.id);
    if (!isExecutive && !isLead && !isMember) {
      return fail(res, "Forbidden — not a member of this project", 403);
    }

    return ok(res, project);
  }

  if (req.method === "PATCH") {
    if (!requireRole(res, session, [Role.PROJECT_LEAD, ...EXECUTIVE_ROLES])) return;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return fail(res, "Project not found", 404);

    // A PROJECT_LEAD can only update projects they lead.
    if (
      session.user.role === Role.PROJECT_LEAD &&
      existing.projectLeadId !== session.user.id
    ) {
      return fail(res, "Forbidden — you are not this project's lead", 403);
    }

    const body = parseBody(res, updateSchema, req.body);
    if (!body) return;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.deadline !== undefined && { deadline: new Date(body.deadline) }),
        ...(body.health !== undefined && { health: body.health }),
        ...(body.projectLeadId !== undefined && { projectLeadId: body.projectLeadId }),
      },
    });

    return ok(res, updated);
  }

  // DELETE
  if (!requireRole(res, session, [Role.PROJECT_LEAD, ...EXECUTIVE_ROLES])) return;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return fail(res, "Project not found", 404);
  if (
    session.user.role === Role.PROJECT_LEAD &&
    existing.projectLeadId !== session.user.id
  ) {
    return fail(res, "Forbidden — you are not this project's lead", 403);
  }

  // Cascade: tasks, memberships, EOD reports first.
  await prisma.$transaction([
    prisma.task.deleteMany({ where: { projectId: id } }),
    prisma.teamMember.deleteMany({ where: { projectId: id } }),
    prisma.eODReport.deleteMany({ where: { projectId: id } }),
    prisma.project.delete({ where: { id } }),
  ]);

  return ok(res, { id, deleted: true });
}
