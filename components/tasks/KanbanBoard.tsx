import { TaskStatus, TaskPriority } from "@prisma/client";
import { formatShortDate } from "@/lib/format";
import PriorityChip from "@/components/tasks/PriorityChip";

export type KanbanTask = {
  id: string;
  taskNumber: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  assignedTo: { name: string } | null;
};

type ColumnDef = {
  status: TaskStatus;
  label: string;
  dotColor: string;
  borderColor: string;
  background?: string;
};

const COLUMNS: ColumnDef[] = [
  { status: "NOT_STARTED", label: "Not Started", dotColor: "#7878A0", borderColor: "#7878A0" },
  { status: "IN_PROGRESS", label: "In Progress", dotColor: "#FB923C", borderColor: "#FB923C" },
  { status: "REVIEW", label: "In Review", dotColor: "#7B6EF6", borderColor: "#7B6EF6" },
  {
    status: "BLOCKED",
    label: "Blocked",
    dotColor: "#F87171",
    borderColor: "#F87171",
    background: "rgba(248,113,113,0.02)",
  },
  {
    status: "DONE",
    label: "Done",
    dotColor: "rgba(74,222,128,0.9)",
    borderColor: "rgba(74,222,128,0.9)",
  },
];

export default function KanbanBoard({
  tasks,
  onCardClick,
}: {
  tasks: KanbanTask[];
  onCardClick: (id: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div
            key={col.status}
            className="flex flex-col flex-1 min-w-[220px] rounded-[8px]"
            style={{ background: col.background ?? "transparent" }}
          >
            <ColumnHeader column={col} count={colTasks.length} />
            <div className="flex flex-col p-2">
              {colTasks.length === 0 ? (
                <p className="text-center text-[13px] text-[#3D3D55] py-6">No tasks</p>
              ) : (
                colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    borderColor={col.borderColor}
                    onClick={() => onCardClick(t.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ColumnHeader({ column, count }: { column: ColumnDef; count: number }) {
  return (
    <div className="flex items-center gap-2 px-2 pb-3 border-b border-[rgba(255,255,255,0.06)]">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: column.dotColor }}
      />
      <span className="text-[13px] font-medium text-[#EEEEF5]">{column.label}</span>
      <span className="ml-auto inline-flex items-center rounded-[10px] bg-[rgba(255,255,255,0.06)] px-2 py-[2px] text-[11px] text-[#7878A0] tabular-nums">
        {count}
      </span>
    </div>
  );
}

function TaskCard({
  task,
  borderColor,
  onClick,
}: {
  task: KanbanTask;
  borderColor: string;
  onClick: () => void;
}) {
  const initials = (task.assignedTo?.name ?? "??")
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#13131E] border border-[rgba(255,255,255,0.06)] rounded-[6px] p-3 mb-2 hover:bg-[#1C1C2E] transition-colors"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <p className="text-[13px] font-medium text-[#EEEEF5] truncate">{task.title}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1C1C2E] text-[10px] font-medium text-[#7878A0] shrink-0">
          {initials}
        </span>
        <span className="text-[11px] text-[#7878A0] tabular-nums ml-auto">
          {task.deadline ? formatShortDate(task.deadline) : "—"}
        </span>
        <PriorityChip priority={task.priority} className="shrink-0" />
      </div>
    </button>
  );
}
