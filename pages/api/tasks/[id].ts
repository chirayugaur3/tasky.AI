import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Role, TaskPriority, TaskStatus, QRStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseBody, requireAuth, requireMethod } from "@/lib/api";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  deadline: z.string().datetime().nullable().optional(),
  blockerReason: z.string().max(500).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  qrStatus: z.nativeEnum(QRStatus).optional(),
});

const EXECUTIVE_ROLES: Role[] = [Role.CEO, Role.CTO, Role.TPM];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET", "PATCH", "DELETE"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  const id = String(req.query.id);
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectLeadId: true } },
    },
  });
  if (!task) return fail(res, "Task not found", 404);

  if (req.method === "GET") {
    // Interns can only view their own tasks.
    if (session.user.role === Role.INTERN && task.assignedToId !== session.user.id) {
      return fail(res, "Forbidden — not your task", 403);
    }
    const full = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true } },
        qrReviewedBy: { select: { id: true, name: true } },
      },
    });
    return ok(res, full);
  }

  if (req.method === "PATCH") {
    const body = parseBody(res, updateSchema, req.body);
    if (!body) return;

    const role = session.user.role;
    const isMyTask = task.assignedToId === session.user.id;
    const isMyProject = task.project.projectLeadId === session.user.id;
    const isExecutive = EXECUTIVE_ROLES.includes(role);

    // --- Field-level authorization ---
    const wantsQRChange = body.qrStatus !== undefined;
    const wantsOtherChange = Object.keys(body).some((k) => k !== "qrStatus");

    if (wantsQRChange) {
      // Only QR or QUALITY_LEAD can move qrStatus.
      if (role !== Role.QR && role !== Role.QUALITY_LEAD) {
        return fail(res, "Forbidden — only QR/QUALITY_LEAD can change QR status", 403);
      }
    }

    if (wantsOtherChange) {
      // Intern: own task only, and ONLY status / blockerReason allowed.
      if (role === Role.INTERN) {
        if (!isMyTask) return fail(res, "Forbidden — not your task", 403);
        const internAllowed = ["status", "blockerReason"];
        const violating = Object.keys(body).filter(
          (k) => !internAllowed.includes(k) && k !== "qrStatus"
        );
        if (violating.length > 0) {
          return fail(
            res,
            `Forbidden — interns may only update: ${internAllowed.join(", ")}`,
            403
          );
        }
      } else if (role === Role.PROJECT_LEAD) {
        if (!isMyProject) {
          return fail(res, "Forbidden — you are not this project's lead", 403);
        }
      } else if (!isExecutive && role !== Role.QUALITY_LEAD) {
        return fail(res, "Forbidden — insufficient role to edit task", 403);
      }
    }

    // --- blockedSince state machine ---
    let blockedSinceUpdate: Date | null | undefined = undefined;
    if (body.status !== undefined) {
      if (body.status === TaskStatus.BLOCKED && task.status !== TaskStatus.BLOCKED) {
        blockedSinceUpdate = new Date();
      } else if (body.status !== TaskStatus.BLOCKED && task.status === TaskStatus.BLOCKED) {
        blockedSinceUpdate = null;
      }
    }

    // --- qrStatus side effects (track reviewer + timestamp) ---
    const qrUpdate: Record<string, unknown> = {};
    if (body.qrStatus !== undefined && body.qrStatus !== task.qrStatus) {
      qrUpdate.qrStatus = body.qrStatus;
      qrUpdate.qrReviewedById = session.user.id;
      qrUpdate.qrReviewedAt = new Date();
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.deadline !== undefined && {
          deadline: body.deadline ? new Date(body.deadline) : null,
        }),
        ...(body.blockerReason !== undefined && { blockerReason: body.blockerReason }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId }),
        ...(blockedSinceUpdate !== undefined && { blockedSince: blockedSinceUpdate }),
        ...qrUpdate,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true } },
        qrReviewedBy: { select: { id: true, name: true } },
      },
    });

    return ok(res, updated);
  }

  // DELETE — only PL of project or executives
  const role = session.user.role;
  if (role === Role.PROJECT_LEAD) {
    if (task.project.projectLeadId !== session.user.id) {
      return fail(res, "Forbidden — you are not this project's lead", 403);
    }
  } else if (!EXECUTIVE_ROLES.includes(role)) {
    return fail(res, "Forbidden — insufficient role to delete task", 403);
  }
  await prisma.task.delete({ where: { id } });
  return ok(res, { id, deleted: true });
}
