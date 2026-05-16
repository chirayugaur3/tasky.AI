import { TaskStatus, TaskPriority } from "@prisma/client";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import StatusBadge, { statusBorderClass } from "@/components/tasks/StatusBadge";
import PriorityChip from "@/components/tasks/PriorityChip";
import Avatar from "@/components/ui/Avatar";

export type TaskRowData = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | string | null;
  assignedTo: { name: string } | null;
};

/**
 * Today's Tasks row — 36px tight, status-colored left bar, single click opens edit.
 *   [bar] [Status]  [Title]              [Avatar] [Time] [Pri]
 */
export default function TaskRow({
  task,
  onClick,
}: {
  task: TaskRowData;
  onClick?: () => void;
}) {
  const isDone = task.status === TaskStatus.DONE;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 border-l-[3px] pl-3 pr-2 h-9 hover:bg-bg-elevated/60 transition-colors rounded-r-button text-left",
        statusBorderClass(task.status)
      )}
    >
      <div className="w-[92px] shrink-0">
        <StatusBadge status={task.status} className="text-meta" />
      </div>
      <p
        className={cn(
          "text-body flex-1 min-w-0 truncate",
          isDone ? "text-text-disabled line-through" : "text-text-primary"
        )}
      >
        {task.title}
      </p>
      <Avatar name={task.assignedTo?.name ?? null} size="sm" />
      <span className="text-meta text-text-secondary w-10 text-right shrink-0 hidden sm:inline tabular-nums">
        {task.deadline ? formatTime(task.deadline) : "—"}
      </span>
      <PriorityChip priority={task.priority} className="w-6 text-right shrink-0" />
    </button>
  );
}
