import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { cn } from "@/lib/cn";
import { ROLE_LABELS } from "@/lib/roles";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Avatar from "@/components/ui/Avatar";

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { HIGH: 1.5, MEDIUM: 1.0, LOW: 0.7 };

type Member = {
  userId: string;
  name: string;
  role: Role;
  currentTask: string | null;
  isPresent: boolean;
  workloadPct: number;
  taskCount: number;
};

type Props = {
  session: Session;
  members: Member[];
  stats: { active: number; absent: number; avgWorkload: number; tasksActive: number; blockedMembers: number };
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.PROJECT_LEAD) return { redirect: { destination: "/dashboard", permanent: false } };

  // Aggregate across all projects this PL leads.
  const projects = await prisma.project.findMany({
    where: { projectLeadId: session.user.id },
    include: {
      teamMembers: { include: { user: { select: { id: true, name: true, role: true } } } },
      tasks: { select: { assignedToId: true, status: true, priority: true, title: true } },
    },
  });

  const memberMap = new Map<string, Member>();
  for (const p of projects) {
    for (const m of p.teamMembers) {
      const existing = memberMap.get(m.userId);
      const openTasks = p.tasks.filter(
        (t) => t.assignedToId === m.userId && t.status !== TaskStatus.DONE
      );
      const units = openTasks.reduce((s, t) => s + PRIORITY_WEIGHT[t.priority], 0);
      const newPct = Math.min(100, Math.round(units * 12.5));
      const currentTask =
        openTasks.find((t) => t.status === TaskStatus.IN_PROGRESS)?.title ??
        openTasks[0]?.title ??
        null;

      if (existing) {
        existing.workloadPct = Math.max(existing.workloadPct, newPct);
        existing.taskCount += openTasks.length;
        if (!existing.currentTask) existing.currentTask = currentTask;
        if (!m.isPresent) existing.isPresent = false;
      } else {
        memberMap.set(m.userId, {
          userId: m.userId,
          name: m.user.name,
          role: m.user.role,
          currentTask: m.isPresent ? currentTask : "Out of Office",
          isPresent: m.isPresent,
          workloadPct: m.isPresent ? newPct : 0,
          taskCount: openTasks.length,
        });
      }
    }
  }

  const members = Array.from(memberMap.values()).sort((a, b) => b.workloadPct - a.workloadPct);
  const active = members.filter((m) => m.isPresent).length;
  const absent = members.length - active;
  const avgWorkload =
    members.length === 0
      ? 0
      : Math.round(members.reduce((s, m) => s + m.workloadPct, 0) / members.length);
  const tasksActive = members.reduce((s, m) => s + m.taskCount, 0);
  const blockedMembers = projects
    .flatMap((p) => p.tasks)
    .filter((t) => t.status === TaskStatus.BLOCKED)
    .reduce(
      (set, t) => (t.assignedToId ? set.add(t.assignedToId) : set),
      new Set<string>()
    ).size;

  return {
    props: {
      session: serializableSession(session),
      members,
      stats: { active, absent, avgWorkload, tasksActive, blockedMembers },
    },
  };
};

function WorkloadBar({ pct, isPresent }: { pct: number; isPresent: boolean }) {
  const color = !isPresent
    ? "bg-bg-elevated"
    : pct > 90
    ? "bg-status-danger"
    : pct > 75
    ? "bg-status-warning"
    : pct > 50
    ? "bg-accent-primary"
    : "bg-status-success";
  return (
    <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden min-w-[80px]">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TeamPage({ members, stats }: Props) {
  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-section text-text-primary">Team</h1>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-meta text-status-success bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] px-3 py-1 rounded-chip">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
          {stats.active} Active
        </span>
        <span className="flex items-center gap-2 text-meta text-status-danger bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] px-3 py-1 rounded-chip">
          <span className="w-1.5 h-1.5 rounded-full bg-status-danger" />
          {stats.absent} Absent
        </span>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Team" header={header}>
      <div className="flex flex-col gap-6 max-w-[1100px]">
        <div className="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
          <table className="w-full text-meta">
            <thead>
              <tr className="text-text-secondary tracking-section uppercase border-b border-border-subtle">
                <th className="text-left font-medium px-4 py-3">Member</th>
                <th className="text-left font-medium py-3">Role</th>
                <th className="text-left font-medium py-3">Current Task</th>
                <th className="text-left font-medium py-3 w-24">Status</th>
                <th className="text-left font-medium py-3 w-40">Workload</th>
                <th className="text-right font-medium py-3 pr-4 w-16">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.userId}
                  className={cn(
                    "border-t border-[rgba(255,255,255,0.04)]",
                    !m.isPresent && "bg-[rgba(248,113,113,0.04)]"
                  )}
                >
                  <td className="px-4 py-3 flex items-center gap-3">
                    <Avatar name={m.name} size="md" />
                    <span className="text-body text-text-primary">{m.name}</span>
                  </td>
                  <td className="py-3 text-text-secondary">{ROLE_LABELS[m.role]}</td>
                  <td className="py-3 text-body text-text-primary truncate max-w-[220px]">
                    {m.currentTask ?? "—"}
                  </td>
                  <td className={cn("py-3 text-meta font-medium", m.isPresent ? "text-status-success" : "text-status-danger")}>
                    {m.isPresent ? "Active" : "Absent"}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <WorkloadBar pct={m.workloadPct} isPresent={m.isPresent} />
                      <span className="text-meta text-text-secondary w-8 text-right">{m.workloadPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right text-body text-text-primary">{m.taskCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-12">
          <div>
            <p className="text-meta text-text-secondary tracking-section uppercase">Avg Workload</p>
            <p className="text-stat text-text-primary">{stats.avgWorkload}%</p>
          </div>
          <div>
            <p className="text-meta text-text-secondary tracking-section uppercase">Tasks Active</p>
            <p className="text-stat text-text-primary">{stats.tasksActive}</p>
          </div>
          <div>
            <p className="text-meta text-text-secondary tracking-section uppercase">Blocked Members</p>
            <p className={cn("text-stat", stats.blockedMembers > 0 ? "text-status-danger" : "text-text-primary")}>
              {stats.blockedMembers}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
