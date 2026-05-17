import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, TaskStatus, TaskPriority } from "@prisma/client";
import { Plus, LayoutGrid, List } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { cn } from "@/lib/cn";
import { formatHeaderDate, formatShortDate } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge, { statusBorderClass } from "@/components/tasks/StatusBadge";
import PriorityChip from "@/components/tasks/PriorityChip";
import Avatar from "@/components/ui/Avatar";
import TaskModal from "@/components/tasks/TaskModal";
import KanbanBoard from "@/components/tasks/KanbanBoard";

type Row = {
  id: string;
  taskNumber: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  project: { id: string; name: string };
  assignedTo: { name: string } | null;
};

type Props = {
  session: Session;
  today: string;
  tasks: Row[];
  projects: { id: string; name: string }[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.PROJECT_LEAD) return { redirect: { destination: "/dashboard", permanent: false } };

  const ledProjects = await prisma.project.findMany({
    where: { projectLeadId: session.user.id },
    select: { id: true, name: true },
  });
  const projectIds = ledProjects.map((p) => p.id);

  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { name: true } },
    },
  });

  return {
    props: {
      session: serializableSession(session),
      today: formatHeaderDate(new Date()),
      projects: ledProjects,
      tasks: tasks.map((t) => ({
        id: t.id,
        taskNumber: t.taskNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline ? t.deadline.toISOString() : null,
        project: t.project,
        assignedTo: t.assignedTo,
      })),
    },
  };
};

type Filter = "ALL" | TaskStatus;

export default function TasksPage({ today, tasks, projects }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(
    typeof router.query.filter === "string" && router.query.filter === "blocked"
      ? TaskStatus.BLOCKED
      : "ALL"
  );
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");

  // Hydrate persisted view choice from localStorage (client-only).
  useEffect(() => {
    const saved = typeof window !== "undefined" && window.localStorage.getItem("tasksView");
    if (saved === "board" || saved === "list") setView(saved);
  }, []);

  function chooseView(next: "board" | "list") {
    setView(next);
    if (typeof window !== "undefined") window.localStorage.setItem("tasksView", next);
  }

  const visible = filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

  function openEdit(id: string) {
    setEditTaskId(id);
    setModalOpen(true);
  }
  function openCreate() {
    setEditTaskId(null);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditTaskId(null);
  }

  const counts: Record<Filter, number> = {
    ALL: tasks.length,
    NOT_STARTED: tasks.filter((t) => t.status === TaskStatus.NOT_STARTED).length,
    IN_PROGRESS: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
    REVIEW: tasks.filter((t) => t.status === TaskStatus.REVIEW).length,
    BLOCKED: tasks.filter((t) => t.status === TaskStatus.BLOCKED).length,
    DONE: tasks.filter((t) => t.status === TaskStatus.DONE).length,
  };

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "BLOCKED", label: "Blocked" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "REVIEW", label: "In Review" },
    { value: "NOT_STARTED", label: "Not Started" },
    { value: "DONE", label: "Done" },
  ];

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <h1 className="text-section text-text-primary">Tasks</h1>
        <p className="text-meta text-text-secondary">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 border border-border-default rounded-button p-0.5">
          <button
            type="button"
            onClick={() => chooseView("board")}
            aria-label="Board view"
            aria-pressed={view === "board"}
            className={cn(
              "p-1.5 rounded-[4px] transition-colors",
              view === "board"
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <LayoutGrid size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => chooseView("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className={cn(
              "p-1.5 rounded-[4px] transition-colors",
              view === "list"
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <List size={14} strokeWidth={1.75} />
          </button>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-accent-primary hover:bg-accent-hover text-text-primary text-meta font-semibold px-4 py-2 rounded-button transition-colors"
        >
          <Plus size={14} /> New Task
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Tasks" header={header}>
      <div className="flex flex-col gap-6 max-w-[1100px]">
        {view === "board" ? (
          <KanbanBoard tasks={tasks} onCardClick={openEdit} />
        ) : (
          <>
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const isSel = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "flex items-center gap-2 text-meta px-3 py-1.5 rounded-chip border transition-colors",
                  isSel
                    ? "border-accent-primary bg-accent-subtle text-accent-primary"
                    : "border-border-default text-text-secondary hover:border-text-secondary hover:text-text-primary"
                )}
              >
                {f.label}
                <span className="text-text-disabled tabular-nums">{counts[f.value]}</span>
              </button>
            );
          })}
        </div>

        {/* Tasks list */}
        <div className="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
          {visible.length === 0 ? (
            <p className="text-body text-text-secondary p-6">No tasks match this filter.</p>
          ) : (
            visible.map((t) => {
              const isDone = t.status === TaskStatus.DONE;
              return (
                <button
                  key={t.id}
                  onClick={() => openEdit(t.id)}
                  className={cn(
                    "w-full flex items-center gap-4 border-l-[3px] pl-3 pr-4 h-10 hover:bg-bg-elevated/40 transition-colors text-left border-t border-[rgba(255,255,255,0.04)] first:border-t-0",
                    statusBorderClass(t.status)
                  )}
                >
                  <div className="w-[88px] shrink-0">
                    <StatusBadge status={t.status} className="text-meta" />
                  </div>
                  <p
                    className={cn(
                      "text-body flex-1 min-w-0 truncate",
                      isDone ? "text-text-disabled line-through" : "text-text-primary"
                    )}
                  >
                    {t.title}
                  </p>
                  <span className="text-meta text-text-secondary hidden md:inline truncate max-w-[160px]">
                    {t.project.name}
                  </span>
                  <Avatar name={t.assignedTo?.name ?? null} size="sm" />
                  <span className="text-meta text-text-secondary w-16 text-right shrink-0 hidden sm:inline tabular-nums">
                    {t.deadline ? formatShortDate(t.deadline) : "—"}
                  </span>
                  <PriorityChip priority={t.priority} className="shrink-0" />
                </button>
              );
            })
          )}
        </div>
          </>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        defaultProjectId={projects[0]?.id}
        editTaskId={editTaskId}
        onSaved={() => router.replace(router.asPath)}
      />
    </DashboardLayout>
  );
}
