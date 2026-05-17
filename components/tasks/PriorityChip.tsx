import { TaskPriority } from "@prisma/client";
import { cn } from "@/lib/cn";
import { priorityLabel } from "@/lib/format";

const CHIP: Record<TaskPriority, string> = {
  HIGH: "text-[#F87171] bg-[rgba(248,113,113,0.10)]",
  MEDIUM: "text-[#FB923C] bg-[rgba(251,146,60,0.10)]",
  LOW: "text-[#7878A0] bg-[rgba(120,120,160,0.10)]",
};

/**
 * HIGH / MED / LOW pill. Filled background, semantic color.
 */
export default function PriorityChip({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-[3px] text-[11px] font-semibold leading-none tracking-wide",
        CHIP[priority],
        className
      )}
    >
      {priorityLabel(priority)}
    </span>
  );
}
