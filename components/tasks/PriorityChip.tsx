import { TaskPriority } from "@prisma/client";
import { cn } from "@/lib/cn";
import { priorityLabel } from "@/lib/format";

const COLOR: Record<TaskPriority, string> = {
  HIGH: "text-status-danger",
  MEDIUM: "text-status-warning",
  LOW: "text-text-secondary",
};

/**
 * "P1" / "P2" / "P3" — semantic color text. Used in the today's tasks table.
 */
export default function PriorityChip({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span className={cn("text-meta font-medium", COLOR[priority], className)}>
      {priorityLabel(priority)}
    </span>
  );
}
