import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
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

type ReviewTask = {
  id: string;
  taskNumber: number;
  title: string;
  status: TaskStatus;
  qrStatus: QRStatus;
  deadline: string | null;
  project: { name: string };
  assignedTo: { name: string } | null;
};

type Props = {
  session: Session;
  userName: string;
  today: string;
  pending: ReviewTask[];
  reviewed: ReviewTask[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.QR) return { redirect: { destination: "/dashboard", permanent: false } };

  const tasks = await prisma.task.findMany({
    where: { status: { in: [TaskStatus.DONE, TaskStatus.IN_PROGRESS] } },
    orderBy: [{ qrStatus: "asc" }, { deadline: "asc" }],
    include: {
      project: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  });

  const all: ReviewTask[] = tasks.map((t) => ({
    id: t.id,
    taskNumber: t.taskNumber,
    title: t.title,
    status: t.status,
    qrStatus: t.qrStatus,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    project: t.project,
    assignedTo: t.assignedTo,
  }));

  return {
    props: {
      session: serializableSession(session),
      userName: session.user.name ?? "",
      today: formatHeaderDate(new Date()),
      pending: all.filter((t) => t.qrStatus === QRStatus.PENDING),
      reviewed: all.filter((t) => t.qrStatus !== QRStatus.PENDING).slice(0, 20),
    },
  };
};

export default function QRDashboard({ userName, today, pending, reviewed }: Props) {
  const router = useRouter();
  const firstName = userName.split(" ")[0] ?? "there";

  async function review(taskId: string, status: QRStatus) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrStatus: status }),
    });
    router.replace(router.asPath);
  }

  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-section text-text-primary">Good morning, {firstName}</h1>
      <span className="text-meta text-text-secondary">{today}</span>
    </div>
  );

  return (
    <DashboardLayout title="Review Queue" header={header}>
      <div className="flex flex-col gap-8 max-w-[1000px]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-section text-text-primary">Pending Review</h2>
            <span className="text-meta text-status-warning bg-[rgba(251,146,60,0.08)] border border-[rgba(251,146,60,0.2)] px-3 py-1 rounded-chip">
              {pending.length} pending
            </span>
          </div>
          {pending.length === 0 ? (
            <p className="text-body text-text-secondary">No tasks pending review.</p>
          ) : (
            <div className="bg-bg-surface border border-border-subtle rounded-card divide-y divide-[rgba(255,255,255,0.04)]">
              {pending.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-4 py-3">
                  <Avatar name={t.assignedTo?.name ?? null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-text-primary truncate">{t.title}</p>
                    <p className="text-meta text-text-secondary">
                      TSK-{String(t.taskNumber).padStart(4, "0")} · {t.project.name}
                    </p>
                  </div>
                  <StatusBadge status={t.status} className="text-meta" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(t.id, QRStatus.APPROVED)}
                      className="text-meta text-status-success bg-[rgba(74,222,128,0.08)] hover:bg-[rgba(74,222,128,0.16)] border border-[rgba(74,222,128,0.2)] px-3 py-1.5 rounded-button transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(t.id, QRStatus.REJECTED)}
                      className="text-meta text-status-danger bg-[rgba(248,113,113,0.08)] hover:bg-[rgba(248,113,113,0.16)] border border-[rgba(248,113,113,0.2)] px-3 py-1.5 rounded-button transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {reviewed.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-section text-text-primary">Recently Reviewed</h2>
            <div className="bg-bg-surface border border-border-subtle rounded-card divide-y divide-[rgba(255,255,255,0.04)]">
              {reviewed.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-4 py-3">
                  <Avatar name={t.assignedTo?.name ?? null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-text-primary truncate">{t.title}</p>
                    <p className="text-meta text-text-secondary">
                      TSK-{String(t.taskNumber).padStart(4, "0")} · {t.project.name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-meta font-medium",
                      t.qrStatus === QRStatus.APPROVED ? "text-status-success" : "text-status-danger"
                    )}
                  >
                    {t.qrStatus.charAt(0) + t.qrStatus.slice(1).toLowerCase()}
                  </span>
                  <span suppressHydrationWarning className="text-meta text-text-secondary w-16 text-right">
                    {t.deadline ? formatShortDate(t.deadline) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
