import type { NextApiRequest, NextApiResponse } from "next";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireAuth, requireMethod } from "@/lib/api";

const EXECUTIVE_ROLES: Role[] = [Role.CEO, Role.CTO, Role.TPM];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["GET"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  // Only roles that can manage teams/projects need to enumerate users.
  const role = session.user.role;
  if (
    role !== Role.PROJECT_LEAD &&
    role !== Role.QUALITY_LEAD &&
    !EXECUTIVE_ROLES.includes(role)
  ) {
    return fail(res, "Forbidden — insufficient role to list users", 403);
  }

  const excludeProjectId =
    typeof req.query.notInProject === "string" ? req.query.notInProject : null;

  let where: Record<string, unknown> | undefined;
  if (excludeProjectId) {
    where = {
      teamMemberships: { none: { projectId: excludeProjectId } },
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, title: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return ok(res, users);
}
