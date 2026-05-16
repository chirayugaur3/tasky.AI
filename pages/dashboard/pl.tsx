import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, TaskStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatHeaderDate } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BlockerAlert, { type BlockerAlertData } from "@/components/dashboard/BlockerAlert";
import TaskRow, { type TaskRowData } from "@/components/dashboard/TaskRow";
import PLRightPanel from "@/components/dashboard/PLRightPanel";
import { ArrowRight, Plus } from "lucide-react";
import TaskModal from "@/components/tasks/TaskModal";

type Member = {
  userId: string;
  name: string;
  isPresent: boolean;
};

type Props = {
  session: Session;
  userName: string;
  projectId: string | null;
  projectName: string | null;
  todayDate: string;
  blockers: BlockerAlertData[];
  todayTasks: TaskRowData[];
  totalTaskCount: number;
  members: Member[];
  velocity: { thisWeek: number; lastWeek: number };
  forecast: {
    confidence80: string | null;
    confidence95: string | null;
  };
  lastGeneratedAt: string | null;
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  if (session.user.role !== Role.PROJECT_LEAD) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }

  // Pick the most urgent project this PL leads. Empty state if none.
  const projects = await prisma.project.findMany({
    where: { projectLeadId: session.user.id },
    orderBy: { deadline: "asc" },
    include: {
      teamMembers: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  const primary = projects[0] ?? null;

  let blockers: BlockerAlertData[] = [];
  let todayTasks: TaskRowData[] = [];
  let totalTaskCount = 0;
  let members: Member[] = [];
  let velocity = { thisWeek: 0, lastWeek: 0 };
  let forecast: Props["forecast"] = { confidence80: null, confidence95: null };
  let lastGeneratedAt: string | null = null;

  if (primary) {
    const allTasks = await prisma.task.findMany({
      where: { projectId: primary.id },
      orderBy: [{ status: "asc" }, { deadline: "asc" }],
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });
    totalTaskCount = allTasks.length;

    blockers = allTasks
      .filter((t) => t.status === TaskStatus.BLOCKED)
      .sort(
        (a, b) =>
          (a.blockedSince?.getTime() ?? 0) - (b.blockedSince?.getTime() ?? 0)
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        assigneeName: t.assignedTo?.name ?? null,
        blockedSince: t.blockedSince ? t.blockedSince.toISOString() : null,
        projectName: primary.name,
      }));

    todayTasks = allTasks
      .filter((t) => t.status !== TaskStatus.DONE || isToday(t.updatedAt))
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline ? t.deadline.toISOString() : null,
        assignedTo: t.assignedTo ? { name: t.assignedTo.name } : null,
      }));

    members = primary.teamMembers.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      isPresent: m.isPresent,
    }));

    // Velocity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    velocity = {
      thisWeek: allTasks.filter(
        (t) => t.status === TaskStatus.DONE && t.updatedAt >= oneWeekAgo
      ).length,
      lastWeek: allTasks.filter(
        (t) =>
          t.status === TaskStatus.DONE &&
          t.updatedAt >= twoWeeksAgo &&
          t.updatedAt < oneWeekAgo
      ).length,
    };

    // Simple linear forecast — same formula as /api/projects/[id]/metrics
    const done = allTasks.filter((t) => t.status === TaskStatus.DONE).length;
    const remaining = allTasks.length - done;
    if (remaining === 0) {
      forecast = {
        confidence80: new Date().toISOString(),
        confidence95: new Date().toISOString(),
      };
    } else {
      const weekly = Math.max(velocity.thisWeek, 1);
      const daysTo80 = Math.ceil((remaining / weekly) * 7);
      const daysTo95 = Math.ceil(daysTo80 * 1.2);
      const d80 = new Date();
      d80.setDate(d80.getDate() + daysTo80);
      const d95 = new Date();
      d95.setDate(d95.getDate() + daysTo95);
      forecast = {
        confidence80: d80.toISOString(),
        confidence95: d95.toISOString(),
      };
    }

    const latestEOD = await prisma.eODReport.findFirst({
      where: { projectId: primary.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    lastGeneratedAt = latestEOD?.date ? latestEOD.date.toISOString() : null;
  }

  // Sanitize session for SSR serialization (undefined → null).
  const serializableSession: Session = {
    ...session,
    user: {
      ...session.user,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    },
  };

  return {
    props: {
      session: serializableSession,
      userName: session.user.name ?? "",
      projectId: primary?.id ?? null,
      projectName: primary?.name ?? null,
      todayDate: formatHeaderDate(new Date()),
      blockers,
      todayTasks,
      totalTaskCount,
      members,
      velocity,
      forecast,
      lastGeneratedAt,
    },
  };
};

function isToday(d: Date): boolean {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function SectionLabel({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-3">
      <p className="text-meta text-text-secondary tracking-section uppercase font-medium">
        {children}
      </p>
      {right}
    </div>
  );
}

export default function PLDashboard(props: Props) {
  const router = useRouter();
  const firstName = props.userName.split(" ")[0] ?? "there";
  const [eodLoading, setEodLoading] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  function openCreate() {
    setEditTaskId(null);
    setTaskModalOpen(true);
  }
  function openEdit(id: string) {
    setEditTaskId(id);
    setTaskModalOpen(true);
  }
  function closeModal() {
    setTaskModalOpen(false);
    setEditTaskId(null);
  }

  async function handleGenerateEOD() {
    if (!props.projectId) return;
    setEodLoading(true);
    router.push("/dashboard/pl/eod");
  }

  const header = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <h1 className="text-section text-text-primary">
          Good morning, {firstName}
        </h1>
        {props.projectName && props.projectId && (
          <Link
            href={`/dashboard/pl/projects/${props.projectId}`}
            className="text-meta text-text-secondary hover:text-accent-primary transition-colors w-fit"
          >
            {props.projectName} →
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-body text-text-secondary hidden sm:inline">
          {props.todayDate}
        </span>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-bg-elevated border border-border-default hover:border-text-secondary text-text-primary text-meta font-medium px-3 py-2 rounded-button transition-colors"
        >
          <Plus size={14} /> New Task
        </button>
        <button
          onClick={handleGenerateEOD}
          disabled={!props.projectId || eodLoading}
          className="bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-text-primary text-meta font-semibold uppercase tracking-section px-4 py-2 rounded-button transition-colors"
        >
          EOD Report
        </button>
      </div>
    </div>
  );

  const rightPanel = (
    <PLRightPanel
      members={props.members}
      velocity={props.velocity}
      forecast={props.forecast}
      lastGeneratedAt={props.lastGeneratedAt}
      onGenerateEOD={handleGenerateEOD}
    />
  );

  if (!props.projectId) {
    return (
      <DashboardLayout title="Dashboard" header={header}>
        <div className="bg-bg-surface border border-border-subtle rounded-card p-10 max-w-[480px] flex flex-col gap-4">
          <h2 className="text-section text-text-primary">No projects yet</h2>
          <p className="text-body text-text-secondary">
            You aren&apos;t leading any projects. Create one to start tracking blockers,
            velocity, and EOD reports.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" header={header} rightPanel={rightPanel}>
      <div className="flex flex-col gap-10 max-w-[920px]">
        {/* BLOCKERS */}
        <section>
          <SectionLabel
            right={
              <span className="text-meta text-status-danger font-medium">
                {props.blockers.length} active
              </span>
            }
          >
            Blockers
          </SectionLabel>
          <div className="flex flex-col gap-0.5">
            {props.blockers.length === 0 ? (
              <p className="text-meta text-text-disabled py-2">No active blockers.</p>
            ) : (
              props.blockers
                .slice(0, 5)
                .map((b) => (
                  <BlockerAlert key={b.id} blocker={b} onClick={() => openEdit(b.id)} />
                ))
            )}
          </div>
          {props.blockers.length > 5 && props.projectId && (
            <Link
              href={`/dashboard/pl/projects/${props.projectId}`}
              className="mt-2 flex items-center gap-1 text-meta text-accent-primary hover:text-accent-hover transition-colors w-fit"
            >
              View all blockers <ArrowRight size={12} />
            </Link>
          )}
        </section>

        {/* TODAY'S TASKS */}
        <section>
          <SectionLabel
            right={
              <span className="text-meta text-text-secondary">
                {props.totalTaskCount} tasks
              </span>
            }
          >
            Today&apos;s Tasks
          </SectionLabel>
          <div className="flex flex-col gap-0.5">
            {props.todayTasks.length === 0 ? (
              <p className="text-meta text-text-disabled py-2">No tasks for today.</p>
            ) : (
              props.todayTasks.map((t) => (
                <TaskRow key={t.id} task={t} onClick={() => openEdit(t.id)} />
              ))
            )}
          </div>
        </section>
      </div>
      <TaskModal
        open={taskModalOpen}
        onClose={closeModal}
        defaultProjectId={props.projectId ?? undefined}
        editTaskId={editTaskId}
        onSaved={() => router.replace(router.asPath)}
      />
    </DashboardLayout>
  );
}
