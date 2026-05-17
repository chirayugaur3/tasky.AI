import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, TaskStatus, TaskPriority, QRStatus, ProjectHealth } from "@prisma/client";
import { ChevronRight, Filter, ArrowUpDown, Plus, UserPlus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { cn } from "@/lib/cn";
import { formatShortDate, formatDaysLeft } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge, { statusBorderClass } from "@/components/tasks/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import AddMemberModal from "@/components/projects/AddMemberModal";
import TaskModal from "@/components/tasks/TaskModal";

const HEALTH_DOT: Record<ProjectHealth, string> = {
  ON_TRACK: "bg-status-success",
  AT_RISK: "bg-status-warning",
  BLOCKED: "bg-status-danger",
};
const HEALTH_TEXT: Record<ProjectHealth, string> = {
  ON_TRACK: "text-status-success",
  AT_RISK: "text-status-warning",
  BLOCKED: "text-status-danger",
};

const QR_STATUS_COLOR: Record<QRStatus, string> = {
  PENDING: "text-text-disabled",
  APPROVED: "text-status-success",
  REJECTED: "text-status-danger",
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  HIGH: 1.5,
  MEDIUM: 1.0,
  LOW: 0.7,
};

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  qrStatus: QRStatus;
  assignedTo: { id: string; name: string } | null;
};

type WorkloadItem = {
  userId: string;
  name: string;
  pct: number;
};

type Props = {
  session: Session;
  project: {
    id: string;
    name: string;
    health: ProjectHealth;
    deadline: string;
    completionPct: number;
    taskCount: number;
    daysLeft: string;
    isOverdue: boolean;
  };
  tasks: TaskItem[];
  workload: WorkloadItem[];
  forecast: { confidence80: string | null; confidence95: string | null };
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.PROJECT_LEAD)
    return { redirect: { destination: "/dashboard", permanent: false } };

  const id = String(ctx.params?.id);
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: [{ status: "asc" }, { deadline: "asc" }],
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      teamMembers: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!project || project.projectLeadId !== session.user.id) {
    return { notFound: true };
  }

  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);

  const tasks: TaskItem[] = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    qrStatus: t.qrStatus,
    assignedTo: t.assignedTo,
  }));

  // Workload per member (same formula as /api/projects/[id]/metrics)
  const workload: WorkloadItem[] = project.teamMembers.map((m) => {
    const open = project.tasks.filter(
      (t) => t.assignedToId === m.userId && t.status !== TaskStatus.DONE
    );
    const units = open.reduce((s, t) => s + PRIORITY_WEIGHT[t.priority], 0);
    return {
      userId: m.userId,
      name: m.user.name,
      pct: Math.min(100, Math.round(units * 12.5)),
    };
  });

  // Forecast
  const remaining = total - done;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekly = Math.max(
    project.tasks.filter((t) => t.status === TaskStatus.DONE && t.updatedAt >= oneWeekAgo).length,
    1
  );
  let confidence80: string | null = null;
  let confidence95: string | null = null;
  if (remaining === 0) {
    confidence80 = new Date().toISOString();
    confidence95 = new Date().toISOString();
  } else {
    const d80 = new Date();
    d80.setDate(d80.getDate() + Math.ceil((remaining / weekly) * 7));
    const d95 = new Date();
    d95.setDate(d95.getDate() + Math.ceil((remaining / weekly) * 7 * 1.2));
    confidence80 = d80.toISOString();
    confidence95 = d95.toISOString();
  }

  const daysLeftStr = formatDaysLeft(project.deadline);
  return {
    props: {
      session: serializableSession(session),
      project: {
        id: project.id,
        name: project.name,
        health: project.health,
        deadline: project.deadline.toISOString(),
        completionPct,
        taskCount: total,
        daysLeft: daysLeftStr,
        isOverdue: daysLeftStr === "Overdue",
      },
      tasks,
      workload,
      forecast: { confidence80, confidence95 },
    },
  };
};

function WorkloadBar({ pct }: { pct: number }) {
  const color =
    pct > 90 ? "bg-status-danger" : pct > 75 ? "bg-status-warning" : pct > 50 ? "bg-accent-primary" : "bg-status-success";
  return (
    <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ProjectDetail({ project, tasks, workload, forecast }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  function openCreateTask() {
    setEditTaskId(null);
    setTaskModalOpen(true);
  }
  function openEditTask(id: string) {
    setEditTaskId(id);
    setTaskModalOpen(true);
  }
  const refresh = () => router.replace(router.asPath);

  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-section text-text-primary">Project Detail</h1>
      <button
        onClick={openCreateTask}
        className="flex items-center gap-1.5 bg-accent-primary hover:bg-accent-hover text-text-primary text-meta font-semibold px-4 py-2 rounded-button transition-colors"
      >
        <Plus size={14} /> New Task
      </button>
    </div>
  );

  return (
    <DashboardLayout title={project.name} header={header}>
      <div className="flex flex-col gap-8 max-w-[1100px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-meta text-text-secondary">
          <Link href="/dashboard/pl/projects" className="hover:text-text-primary transition-colors">
            Projects
          </Link>
          <ChevronRight size={12} />
          <span className="text-text-primary">{project.name}</span>
        </div>

        {/* Title row with KPI boxes */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={cn("w-2.5 h-2.5 rounded-full", HEALTH_DOT[project.health])} />
            <h2 className="text-hero text-text-primary">{project.name}</h2>
            <span className={cn("text-meta font-semibold tracking-section uppercase", HEALTH_TEXT[project.health])}>
              {project.health.replace("_", " ")}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="bg-bg-surface border border-border-subtle rounded-card px-4 py-2 min-w-[80px]">
              <p className="text-meta text-text-secondary tracking-section uppercase">Done</p>
              <p className="text-section text-text-primary">{project.completionPct}%</p>
            </div>
            <div className="bg-bg-surface border border-border-subtle rounded-card px-4 py-2 min-w-[80px]">
              <p className="text-meta text-text-secondary tracking-section uppercase">Tasks</p>
              <p className="text-section text-text-primary">{project.taskCount}</p>
            </div>
            <div
              className={cn(
                "bg-bg-surface border rounded-card px-4 py-2 min-w-[100px]",
                project.isOverdue ? "border-status-danger" : "border-border-subtle"
              )}
            >
              <p className="text-meta text-text-secondary tracking-section uppercase">Days Left</p>
              <p className={cn("text-section", project.isOverdue ? "text-status-danger" : "text-text-primary")}>
                {project.daysLeft}
              </p>
            </div>
          </div>
        </div>

        {/* TASKS table */}
        <section className="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
            <p className="text-meta text-text-secondary tracking-section uppercase font-medium">Tasks</p>
            <div className="flex items-center gap-2 text-text-secondary">
              <button className="p-1 hover:text-text-primary transition-colors" title="Filter"><Filter size={16} /></button>
              <button className="p-1 hover:text-text-primary transition-colors" title="Sort"><ArrowUpDown size={16} /></button>
              <button onClick={openCreateTask} className="p-1 hover:text-accent-primary transition-colors" title="Add task"><Plus size={16} /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-meta">
              <thead>
                <tr className="text-text-secondary tracking-section uppercase">
                  <th className="text-left font-medium px-6 py-2 w-32">Status</th>
                  <th className="text-left font-medium py-2">Task</th>
                  <th className="text-left font-medium py-2 w-24">Assignee</th>
                  <th className="text-left font-medium py-2 w-24">Deadline</th>
                  <th className="text-left font-medium py-2 w-16">Pri</th>
                  <th className="text-left font-medium py-2 w-24 pr-6">QR Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const isDone = t.status === TaskStatus.DONE;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => openEditTask(t.id)}
                      className={cn(
                        "border-t border-[rgba(255,255,255,0.04)] border-l-[3px] hover:bg-bg-elevated/30 transition-colors cursor-pointer",
                        statusBorderClass(t.status)
                      )}
                    >
                      <td className="pl-6 py-3"><StatusBadge status={t.status} className="text-meta" /></td>
                      <td className={cn("py-3 text-body", isDone ? "text-text-disabled line-through" : "text-text-primary")}>
                        {t.title}
                      </td>
                      <td className="py-3">
                        <Avatar name={t.assignedTo?.name ?? null} size="sm" />
                      </td>
                      <td suppressHydrationWarning className="py-3 text-text-secondary">
                        {t.deadline ? formatShortDate(t.deadline) : "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "text-meta font-medium",
                            t.priority === "HIGH"
                              ? "text-status-danger"
                              : t.priority === "MEDIUM"
                              ? "text-status-warning"
                              : "text-text-secondary"
                          )}
                        >
                          {t.priority === "HIGH" ? "↑↑" : t.priority === "MEDIUM" ? "↑" : "—"}
                        </span>
                      </td>
                      <td className={cn("py-3 pr-6 text-meta", QR_STATUS_COLOR[t.qrStatus])}>
                        {t.qrStatus.charAt(0) + t.qrStatus.slice(1).toLowerCase()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* TEAM WORKLOAD */}
        <section className="bg-bg-surface border border-border-subtle rounded-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-meta text-text-secondary tracking-section uppercase font-medium">
              Team Workload <span className="text-text-disabled normal-case tracking-normal">· {workload.length}</span>
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 text-meta text-accent-primary hover:text-accent-hover transition-colors"
            >
              <UserPlus size={14} /> Add member
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {workload.length === 0 && (
              <p className="text-meta text-text-disabled">No members assigned. Click <span className="text-accent-primary">Add member</span> to start.</p>
            )}
            {workload.map((w) => (
              <div key={w.userId} className="flex items-center gap-4">
                <Avatar name={w.name} size="sm" />
                <span className="text-body text-text-primary w-32 truncate">{w.name}</span>
                <WorkloadBar pct={w.pct} />
                <span
                  className={cn(
                    "text-meta font-medium w-10 text-right",
                    w.pct > 90 ? "text-status-danger" : w.pct > 75 ? "text-status-warning" : "text-text-secondary"
                  )}
                >
                  {w.pct}%
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* FORECAST */}
        <section className="bg-bg-surface border border-border-subtle rounded-card p-6">
          <p className="text-meta text-text-secondary tracking-section uppercase font-medium mb-4">Forecast</p>
          <div className="flex gap-8">
            <div>
              <p suppressHydrationWarning className="text-stat text-accent-primary">
                80% by {forecast.confidence80 ? formatShortDate(forecast.confidence80) : "—"}
              </p>
              <p className="text-meta text-text-secondary">High confidence</p>
            </div>
            <div>
              <p suppressHydrationWarning className="text-stat text-text-secondary">
                95% by {forecast.confidence95 ? formatShortDate(forecast.confidence95) : "—"}
              </p>
              <p className="text-meta text-text-secondary">Maximum estimate</p>
            </div>
          </div>
        </section>
      </div>

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={refresh}
        projectId={project.id}
      />
      <TaskModal
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditTaskId(null); }}
        defaultProjectId={project.id}
        editTaskId={editTaskId}
        onSaved={refresh}
      />
    </DashboardLayout>
  );
}
