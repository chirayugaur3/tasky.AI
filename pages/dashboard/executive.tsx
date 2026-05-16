import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, TaskStatus, ProjectHealth } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { cn } from "@/lib/cn";
import { formatHeaderDate, formatDaysLeft, initials } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";

const HEALTH_DOT: Record<ProjectHealth, string> = {
  ON_TRACK: "bg-status-success",
  AT_RISK: "bg-status-warning",
  BLOCKED: "bg-status-danger",
};

type ProjectRow = {
  id: string;
  name: string;
  health: ProjectHealth;
  daysLeft: string;
  isOverdue: boolean;
  completionPct: number;
  taskCount: number;
  blockedCount: number;
  leadName: string;
};

type Props = {
  session: Session;
  userName: string;
  today: string;
  stats: {
    totalProjects: number;
    onTrack: number;
    atRisk: number;
    blocked: number;
    totalTasks: number;
    totalBlockers: number;
  };
  projects: ProjectRow[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  const execRoles: Role[] = [Role.CEO, Role.CTO, Role.TPM];
  if (!execRoles.includes(session.user.role)) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }

  const projects = await prisma.project.findMany({
    include: {
      projectLead: { select: { name: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { deadline: "asc" },
  });

  const rows: ProjectRow[] = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const blocked = p.tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
    const daysLeftStr = formatDaysLeft(p.deadline);
    return {
      id: p.id,
      name: p.name,
      health: p.health,
      daysLeft: daysLeftStr,
      isOverdue: daysLeftStr === "Overdue",
      completionPct: total === 0 ? 0 : Math.round((done / total) * 100),
      taskCount: total,
      blockedCount: blocked,
      leadName: p.projectLead.name,
    };
  });

  const stats = {
    totalProjects: rows.length,
    onTrack: rows.filter((r) => r.health === ProjectHealth.ON_TRACK).length,
    atRisk: rows.filter((r) => r.health === ProjectHealth.AT_RISK).length,
    blocked: rows.filter((r) => r.health === ProjectHealth.BLOCKED).length,
    totalTasks: rows.reduce((s, r) => s + r.taskCount, 0),
    totalBlockers: rows.reduce((s, r) => s + r.blockedCount, 0),
  };

  return {
    props: {
      session: serializableSession(session),
      userName: session.user.name ?? "",
      today: formatHeaderDate(new Date()),
      stats,
      projects: rows,
    },
  };
};

export default function ExecutiveDashboard({ userName, today, stats, projects }: Props) {
  const firstName = userName.split(" ")[0] ?? "there";
  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-section text-text-primary">Good morning, {firstName}</h1>
      <span className="text-meta text-text-secondary">{today}</span>
    </div>
  );

  return (
    <DashboardLayout title="Executive Overview" header={header}>
      <div className="flex flex-col gap-8 max-w-[1100px]">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Projects", value: stats.totalProjects, color: "text-text-primary" },
            { label: "On Track", value: stats.onTrack, color: "text-status-success" },
            { label: "At Risk", value: stats.atRisk, color: "text-status-warning" },
            { label: "Blocked", value: stats.blocked, color: "text-status-danger" },
            { label: "Tasks", value: stats.totalTasks, color: "text-text-primary" },
            { label: "Blockers", value: stats.totalBlockers, color: stats.totalBlockers > 0 ? "text-status-danger" : "text-text-primary" },
          ].map((tile) => (
            <div key={tile.label} className="bg-bg-surface border border-border-subtle rounded-card p-4">
              <p className="text-meta text-text-secondary tracking-section uppercase">{tile.label}</p>
              <p className={cn("text-stat", tile.color)}>{tile.value}</p>
            </div>
          ))}
        </div>

        {/* Projects table */}
        <section className="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
          <div className="px-6 py-3 border-b border-border-subtle">
            <p className="text-meta text-text-secondary tracking-section uppercase font-medium">All Projects</p>
          </div>
          <table className="w-full text-meta">
            <thead>
              <tr className="text-text-secondary tracking-section uppercase">
                <th className="text-left font-medium px-6 py-2 w-32">Health</th>
                <th className="text-left font-medium py-2">Project</th>
                <th className="text-left font-medium py-2 w-32">Lead</th>
                <th className="text-left font-medium py-2 w-24">Done</th>
                <th className="text-left font-medium py-2 w-24">Tasks</th>
                <th className="text-left font-medium py-2 w-24">Blockers</th>
                <th className="text-left font-medium py-2 pr-6 w-28">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-[rgba(255,255,255,0.04)] hover:bg-bg-elevated/30 transition-colors">
                  <td className="px-6 py-3 flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", HEALTH_DOT[p.health])} />
                    <span className="text-meta text-text-secondary">{p.health.replace("_", " ")}</span>
                  </td>
                  <td className="py-3 text-body text-text-primary">{p.name}</td>
                  <td className="py-3 text-text-secondary flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-chip bg-bg-elevated text-[10px] font-medium">
                      {initials(p.leadName)}
                    </span>
                    {p.leadName}
                  </td>
                  <td className="py-3 text-body text-text-primary">{p.completionPct}%</td>
                  <td className="py-3 text-body text-text-primary">{p.taskCount}</td>
                  <td className={cn("py-3 text-body font-medium", p.blockedCount > 0 ? "text-status-danger" : "text-text-secondary")}>
                    {p.blockedCount}
                  </td>
                  <td className={cn("py-3 pr-6 text-meta", p.isOverdue ? "text-status-danger" : "text-text-secondary")}>
                    {p.daysLeft}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardLayout>
  );
}
