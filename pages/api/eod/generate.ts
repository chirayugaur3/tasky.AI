import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateEODReport } from "@/lib/eod";
import { fail, ok, parseBody, requireAuth, requireMethod, requireRole } from "@/lib/api";

const bodySchema = z.object({
  projectId: z.string(),
  context: z.string().max(4000),
  persist: z.boolean().optional().default(true),
});

function formatDateDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireMethod(req, res, ["POST"])) return;
  const session = await requireAuth(req, res);
  if (!session) return;

  if (!requireRole(res, session, [Role.PROJECT_LEAD])) return;

  const body = parseBody(res, bodySchema, req.body);
  if (!body) return;

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { id: true, name: true, projectLeadId: true },
  });
  if (!project) return fail(res, "Project not found", 404);
  if (project.projectLeadId !== session.user.id) {
    return fail(res, "Forbidden — you are not this project's lead", 403);
  }

  let report;
  try {
    report = await generateEODReport({
      projectName: project.name,
      date: formatDateDDMMYYYY(new Date()),
      plContext: body.context,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Groq call failed";
    return fail(res, msg, 502);
  }

  let saved = null;
  if (body.persist) {
    saved = await prisma.eODReport.create({
      data: {
        context: body.context,
        generatedReport: report.formattedText,
        projectLeadId: session.user.id,
        projectId: body.projectId,
      },
    });
  }

  return ok(res, {
    report,
    persistedId: saved?.id ?? null,
  });
}
