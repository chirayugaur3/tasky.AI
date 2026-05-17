import { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  BLOCKED: "Blocked",
  DONE: "Done",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  NOT_STARTED: "text-text-secondary",
  IN_PROGRESS: "text-status-warning",
  REVIEW: "text-[#7B6EF6] bg-[rgba(123,110,246,0.10)] px-2 py-[3px] rounded-[4px] text-[11px] font-semibold leading-none",
  BLOCKED: "text-status-danger",
  DONE: "text-status-success",
};

/**
 * Status as colored text — never a filled badge, except REVIEW which is a chip
 * per spec (so "In Review" stands out as the explicit hand-off moment).
 */
export default function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const isReviewChip = status === "REVIEW";
  return (
    <span
      className={cn(
        !isReviewChip && "text-body font-medium",
        STATUS_CLASS[status],
        className
      )}
    >
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
    case "REVIEW":
      return "border-l-[#7B6EF6]";
    case "DONE":
      return "border-l-status-success";
    case "NOT_STARTED":
    default:
      return "border-l-transparent";
  }
}
