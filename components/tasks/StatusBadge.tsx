import { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  NOT_STARTED: "text-text-secondary",
  IN_PROGRESS: "text-status-warning",
  BLOCKED: "text-status-danger",
  DONE: "text-status-success",
};

/**
 * Status as colored text — never a filled badge. Per design system.
 */
export default function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span className={cn("text-body font-medium", STATUS_CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function statusBorderClass(status: TaskStatus): string {
  switch (status) {
    case "BLOCKED":
      return "border-l-status-danger";
    case "IN_PROGRESS":
      return "border-l-status-warning";
    case "DONE":
      return "border-l-status-success";
    case "NOT_STARTED":
    default:
      return "border-l-transparent";
  }
}
