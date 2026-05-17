import Link from "next/link";
import { ProjectHealth } from "@prisma/client";
import { cn } from "@/lib/cn";
import { formatDaysLeft, initials } from "@/lib/format";

export type ProjectCardData = {
  id: string;
  name: string;
  description: string | null;
  health: ProjectHealth;
  deadline: string | Date;
  doneCount: number;
  taskCount: number;
  blockedCount: number;
  completionPct: number;
  projectLead: { name: string } | null;
};

const HEALTH: Record<
  ProjectHealth,
  { label: string; text: string; border: string; dot: string }
> = {
  ON_TRACK: {
    label: "ON TRACK",
    text: "text-status-success",
    border: "border-l-status-success",
    dot: "bg-status-success",
  },
  AT_RISK: {
    label: "AT RISK",
    text: "text-status-warning",
    border: "border-l-status-warning",
    dot: "bg-status-warning",
  },
  BLOCKED: {
    label: "BLOCKED",
    text: "text-status-danger",
    border: "border-l-status-danger",
    dot: "bg-status-danger",
  },
};

export default function ProjectCard({ project, href }: { project: ProjectCardData; href: string }) {
  const h = HEALTH[project.health];
  const daysLeft = formatDaysLeft(project.deadline);
  const isOverdue = daysLeft === "Overdue";
  return (
    <Link
      href={href}
      className={cn(
        "block bg-bg-surface border border-border-subtle rounded-card p-6 hover:border-border-default transition-colors border-l-[3px]",
        h.border
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", h.dot)} />
          <span className={cn("text-meta font-semibold tracking-section uppercase", h.text)}>
            {h.label}
          </span>
        </div>
        <span
          suppressHydrationWarning
          className={cn(
            "text-meta",
            isOverdue ? "text-status-danger font-medium" : "text-text-secondary"
          )}
        >
          {daysLeft}
        </span>
      </div>
      <h3 className="text-ui font-semibold text-text-primary mb-1">{project.name}</h3>
      {project.description && (
        <p className="text-meta text-text-secondary line-clamp-2 mb-4">{project.description}</p>
      )}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <p className="text-meta text-text-secondary tracking-section uppercase">Done</p>
          <p className="text-body text-text-primary font-semibold">{project.completionPct}%</p>
        </div>
        <div>
          <p className="text-meta text-text-secondary tracking-section uppercase">Tasks</p>
          <p className="text-body text-text-primary font-semibold">{project.taskCount}</p>
        </div>
        <div>
          <p className="text-meta text-text-secondary tracking-section uppercase">Blockers</p>
          <p
            className={cn(
              "text-body font-semibold",
              project.blockedCount > 0 ? "text-status-danger" : "text-text-primary"
            )}
          >
            {project.blockedCount}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-chip bg-bg-elevated text-text-secondary text-[10px] font-medium"
          title={project.projectLead?.name ?? ""}
        >
          {initials(project.projectLead?.name)}
        </span>
      </div>
    </Link>
  );
}
