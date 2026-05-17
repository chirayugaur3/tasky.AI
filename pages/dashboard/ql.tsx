import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, QRStatus, TaskStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { cn } from "@/lib/cn";
import { formatHeaderDate, formatShortDate } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/tasks/StatusBadge";

type Row = {
  id: string;
  taskNumber: number;
  title: string;
  status: TaskStatus;
  qrStatus: QRStatus;
  deadline: string | null;
  projectName: string;
  reviewer: string | null;
  assigneeName: string | null;
};

type Props = {
  session: Session;
  userName: string;
  today: string;
  stats: { pending: number; approved: number; rejected: number };
  rows: Row[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.QUALITY_LEAD) return { redirect: { destination: "/dashboard", permanent: false } };

  const tasks = await prisma.task.findMany({
    orderBy: [{ qrStatus: "asc" }, { deadline: "asc" }],
    include: {
      project: { select: { name: true } },
      assignedTo: { select: { name: true } },
      qrReviewedBy: { select: { name: true } },
    },
  });

  const rows: Row[] = tasks.map((t) => ({
    id: t.id,
    taskNumber: t.taskNumber,
    title: t.title,
    status: t.status,
    qrStatus: t.qrStatus,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    projectName: t.project.name,
    reviewer: t.qrReviewedBy?.name ?? null,
    assigneeName: t.assignedTo?.name ?? null,
  }));

  return {
    props: {
      session: serializableSession(session),
      userName: session.user.name ?? "",
      today: formatHeaderDate(new Date()),
      stats: {
        pending: rows.filter((r) => r.qrStatus === QRStatus.PENDING).length,
        approved: rows.filter((r) => r.qrStatus === QRStatus.APPROVED).length,
        rejected: rows.filter((r) => r.qrStatus === QRStatus.REJECTED).length,
      },
      rows: rows.slice(0, 50),
    },
  };
};

export default function QLDashboard({ userName, today, stats, rows }: Props) {
  const firstName = userName.split(" ")[0] ?? "there";
  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-section text-text-primary">Good morning, {firstName}</h1>
      <span className="text-meta text-text-secondary">{today}</span>
    </div>
  );

  return (
    <DashboardLayout title="Quality Review" header={header}>
      <div className="flex flex-col gap-8 max-w-[1100px]">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: stats.pending, color: "text-status-warning" },
            { label: "Approved", value: stats.approved, color: "text-status-success" },
            { label: "Rejected", value: stats.rejected, color: "text-status-danger" },
          ].map((t) => (
            <div key={t.label} className="bg-bg-surface border border-border-subtle rounded-card p-4">
              <p className="text-meta text-text-secondary tracking-section uppercase">{t.label}</p>
              <p className={cn("text-stat", t.color)}>{t.value}</p>
            </div>
          ))}
        </div>

        <section className="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
          <div className="px-6 py-3 border-b border-border-subtle">
            <p className="text-meta text-text-secondary tracking-section uppercase font-medium">Review Activity</p>
          </div>
          <table className="w-full text-meta">
            <thead>
              <tr className="text-text-secondary tracking-section uppercase">
                <th className="text-left font-medium px-6 py-2">Task</th>
                <th className="text-left font-medium py-2 w-32">Project</th>
                <th className="text-left font-medium py-2 w-32">Assignee</th>
                <th className="text-left font-medium py-2 w-24">Status</th>
                <th className="text-left font-medium py-2 w-24">QR</th>
                <th className="text-left font-medium py-2 w-28">Reviewer</th>
                <th className="text-left font-medium py-2 pr-6 w-24">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[rgba(255,255,255,0.04)]">
                  <td className="px-6 py-3 text-body text-text-primary">
                    <p className="truncate max-w-[280px]">{r.title}</p>
                    <p className="text-meta text-text-disabled">TSK-{String(r.taskNumber).padStart(4, "0")}</p>
                  </td>
                  <td className="py-3 text-text-secondary truncate max-w-[140px]">{r.projectName}</td>
                  <td className="py-3 text-text-secondary flex items-center gap-2">
                    {r.assigneeName && <Avatar name={r.assigneeName} size="sm" />}
                    <span className="truncate">{r.assigneeName ?? "—"}</span>
                  </td>
                  <td className="py-3"><StatusBadge status={r.status} className="text-meta" /></td>
                  <td
                    className={cn(
                      "py-3 font-medium",
                      r.qrStatus === QRStatus.APPROVED
                        ? "text-status-success"
                        : r.qrStatus === QRStatus.REJECTED
                        ? "text-status-danger"
                        : "text-text-disabled"
                    )}
                  >
                    {r.qrStatus.charAt(0) + r.qrStatus.slice(1).toLowerCase()}
                  </td>
                  <td className="py-3 text-text-secondary truncate max-w-[120px]">{r.reviewer ?? "—"}</td>
                  <td suppressHydrationWarning className="py-3 pr-6 text-text-secondary">
                    {r.deadline ? formatShortDate(r.deadline) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardLayout>
  );
}
