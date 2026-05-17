import { useState } from "react";
import { Info, Lock } from "lucide-react";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { cn } from "@/lib/cn";
import { formatDaysLeft } from "@/lib/format";
import PriorityChip from "@/components/tasks/PriorityChip";

export type InternTask = {
  id: string;
  taskNumber: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  blockerReason: string | null;
  deadline: string | null;
  project: { name: string };
};

type SelectableStatus = Exclude<TaskStatus, "DONE">;

const SEGMENTS: { value: SelectableStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REVIEW", label: "In Review" },
  { value: "BLOCKED", label: "Blocked" },
];

const SEGMENT_COLOR: Record<TaskStatus, string> = {
  NOT_STARTED: "border-text-secondary text-text-secondary bg-bg-elevated",
  IN_PROGRESS: "border-status-warning text-status-warning bg-[rgba(251,146,60,0.08)]",
  REVIEW: "border-[#7B6EF6] text-[#7B6EF6] bg-[rgba(123,110,246,0.10)]",
  BLOCKED: "border-status-danger text-status-danger bg-[rgba(248,113,113,0.08)]",
  DONE: "border-status-success text-status-success bg-[rgba(74,222,128,0.08)]",
};

function dueChip(deadline: string | null): { label: string; cls: string } | null {
  if (!deadline) return null;
  const label = formatDaysLeft(deadline);
  if (label === "Overdue")
    return { label, cls: "bg-[rgba(248,113,113,0.12)] text-status-danger border border-status-danger" };
  if (label === "Today")
    return { label: "Due Today", cls: "border border-status-warning text-status-warning" };
  return { label: `Due ${label}`, cls: "text-text-secondary" };
}

export default function InternTaskCard({
  task,
  onChange,
}: {
  task: InternTask;
  onChange?: () => void;
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [saving, setSaving] = useState(false);
  const due = dueChip(task.deadline);

  async function update(next: TaskStatus, reason?: string) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { status: next };
      if (next === "BLOCKED" && reason !== undefined) body.blockerReason = reason;
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      setStatus(next);
      onChange?.();
    } catch {
      // soft fail — revert UI state
    } finally {
      setSaving(false);
    }
  }

  const isBlocked = status === "BLOCKED";

  return (
    <div
      className={cn(
        "bg-bg-surface border border-border-subtle rounded-card p-4 sm:p-5 flex flex-col gap-3",
        isBlocked && "border-l-[3px] border-l-status-danger"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PriorityChip priority={task.priority} />
            <p className="text-body font-medium text-text-primary truncate">{task.title}</p>
          </div>
          <p className="text-meta text-text-secondary">
            TSK-{String(task.taskNumber).padStart(4, "0")} · {task.project.name}
          </p>
          {task.description && !isBlocked && (
            <p className="text-meta text-text-secondary line-clamp-2 mt-1.5">{task.description}</p>
          )}
          {isBlocked && task.blockerReason && (
            <p className="text-meta text-text-secondary italic mt-2">{task.blockerReason}</p>
          )}
        </div>
        {due && (
          <span className={cn("text-meta px-2 py-1 rounded-chip shrink-0", due.cls)}>{due.label}</span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {SEGMENTS.map((s) => {
          const isSelected = status === s.value;
          return (
            <button
              key={s.value}
              disabled={saving}
              onClick={() => update(s.value, s.value === "BLOCKED" ? blockerReason : undefined)}
              className={cn(
                "py-2 px-1 text-meta font-medium rounded-button border transition-colors min-h-[44px]",
                isSelected
                  ? SEGMENT_COLOR[s.value]
                  : "border-border-default text-text-secondary hover:border-text-secondary"
              )}
            >
              {s.label}
            </button>
          );
        })}
        <button
          type="button"
          disabled
          title="Admin approval required"
          className={cn(
            "py-2 px-1 text-meta font-medium rounded-button border transition-colors min-h-[44px] flex items-center justify-center gap-1.5",
            status === "DONE"
              ? SEGMENT_COLOR.DONE
              : "border-border-default text-text-disabled cursor-not-allowed opacity-60"
          )}
        >
          <Lock size={12} strokeWidth={1.75} /> Done
        </button>
      </div>

      <StatusEcho status={status} />

      {isBlocked && (
        <div className="flex flex-col gap-1.5 mt-1">
          <label className="text-meta text-text-secondary">What&apos;s blocking you?</label>
          <input
            value={blockerReason}
            onChange={(e) => setBlockerReason(e.target.value)}
            onBlur={() => blockerReason !== (task.blockerReason ?? "") && update("BLOCKED", blockerReason)}
            placeholder="Awaiting access clearance for…"
            className="bg-bg-elevated border border-border-default rounded-card px-3 py-2 text-body text-text-primary outline-none focus:border-accent-primary transition-colors"
          />
          <p className="flex items-center gap-1.5 text-meta text-text-disabled">
            <Info size={12} /> This will notify your Project Lead.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusEcho({ status }: { status: TaskStatus }) {
  if (status === "REVIEW") {
    return (
      <p className="text-[12px] italic" style={{ color: "rgba(74,222,128,0.9)" }}>
        ✓ Submitted for review · Admin notified
      </p>
    );
  }
  if (status === "DONE") {
    return (
      <p className="text-[12px] italic" style={{ color: "rgba(74,222,128,0.9)" }}>
        ✓ Approved by Admin
      </p>
    );
  }
  if (status === "BLOCKED") {
    return (
      <p className="text-[12px] italic text-[#F87171]">
        ⚠ Blocked · Admin has been notified
      </p>
    );
  }
  return null;
}
