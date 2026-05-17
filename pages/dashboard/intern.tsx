import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, TaskStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { formatHeaderDate } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import InternTaskCard, { type InternTask } from "@/components/tasks/InternTaskCard";

type Props = {
  session: Session;
  userName: string;
  today: string;
  todayTasks: InternTask[];
  upcoming: InternTask[];
  completedToday: InternTask[];
  todayCount: number;
  blockedCount: number;
  reviewCount: number;
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.INTERN) return { redirect: { destination: "/dashboard", permanent: false } };

  const tasks = await prisma.task.findMany({
    where: { assignedToId: session.user.id },
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
    include: { project: { select: { name: true } } },
  });

  const startOfTomorrow = new Date();
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  startOfTomorrow.setHours(0, 0, 0, 0);

  const todayTasks: InternTask[] = [];
  const upcoming: InternTask[] = [];
  const completedToday: InternTask[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const t of tasks) {
    const row: InternTask = {
      id: t.id,
      taskNumber: t.taskNumber,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      blockerReason: t.blockerReason,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      project: t.project,
    };
    if (t.status === TaskStatus.DONE) {
      if (t.updatedAt >= startOfToday) completedToday.push(row);
      continue;
    }
    if (!t.deadline || t.deadline < startOfTomorrow) todayTasks.push(row);
    else upcoming.push(row);
  }

  // Sort: Blocked first, then Overdue, then today by priority (HIGH first), then by deadline.
  const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const taskSorter = (a: InternTask, b: InternTask) => {
    const aBlocked = a.status === TaskStatus.BLOCKED ? 0 : 1;
    const bBlocked = b.status === TaskStatus.BLOCKED ? 0 : 1;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    const aOverdue = a.deadline && new Date(a.deadline) < new Date() ? 0 : 1;
    const bOverdue = b.deadline && new Date(b.deadline) < new Date() ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    const pri = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pri !== 0) return pri;
    const aT = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bT = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aT - bT;
  };
  todayTasks.sort(taskSorter);
  upcoming.sort(taskSorter);

  const blockedCount = tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
  const reviewCount = tasks.filter((t) => t.status === TaskStatus.REVIEW).length;

  return {
    props: {
      session: serializableSession(session),
      userName: session.user.name ?? "",
      today: formatHeaderDate(new Date()),
      todayTasks,
      upcoming,
      completedToday,
      todayCount: todayTasks.length,
      blockedCount,
      reviewCount,
    },
  };
};

export default function InternDashboard(props: Props) {
  const router = useRouter();
  const firstName = props.userName.split(" ")[0] ?? "there";

  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-section text-text-primary">Good morning, {firstName}</h1>
      <span className="text-meta text-text-secondary">{props.today}</span>
    </div>
  );

  return (
    <DashboardLayout title="My Tasks" header={header}>
      <div className="max-w-[800px] flex flex-col gap-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-section text-text-primary">My Tasks</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatChip dotColor="#7B6EF6" label={`${props.todayCount} Tasks Today`} />
            <StatChip dotColor="#F87171" label={`${props.blockedCount} Blocked`} />
            <StatChip dotColor="#7B6EF6" label={`${props.reviewCount} In Review`} />
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <p className="text-meta text-text-secondary tracking-section uppercase font-medium">Today</p>
          {props.todayTasks.length === 0 ? (
            <p className="text-body text-text-secondary">No tasks for today.</p>
          ) : (
            props.todayTasks.map((t) => (
              <InternTaskCard
                key={t.id}
                task={t}
                onChange={() => router.replace(router.asPath)}
              />
            ))
          )}
        </section>

        {props.upcoming.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-meta text-text-secondary tracking-section uppercase font-medium">Upcoming</p>
            {props.upcoming.map((t) => (
              <InternTaskCard
                key={t.id}
                task={t}
                onChange={() => router.replace(router.asPath)}
              />
            ))}
          </section>
        )}

        {props.completedToday.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-meta text-text-secondary tracking-section uppercase font-medium">
                Completed today
              </p>
              <span className="text-meta text-text-disabled">
                {props.completedToday.length}{" "}
                {props.completedToday.length === 1 ? "task" : "tasks"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {props.completedToday.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 border-l-[3px] border-l-status-success pl-3 pr-2 h-9 rounded-r-button"
                >
                  <p className="text-body text-text-disabled line-through flex-1 min-w-0 truncate">
                    {t.title}
                  </p>
                  <span className="text-meta text-text-disabled">
                    TSK-{String(t.taskNumber).padStart(4, "0")}
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

function StatChip({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 bg-[#13131E] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-[14px] py-2 text-[13px] text-[#EEEEF5]">
      <span
        className="w-[6px] h-[6px] rounded-full shrink-0"
        style={{ background: dotColor }}
      />
      {label}
    </span>
  );
}
