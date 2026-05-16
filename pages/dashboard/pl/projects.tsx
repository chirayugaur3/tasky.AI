import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role, TaskStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProjectCard, { type ProjectCardData } from "@/components/projects/ProjectCard";
import ProjectModal from "@/components/projects/ProjectModal";

type Props = {
  session: Session;
  projects: ProjectCardData[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.PROJECT_LEAD)
    return { redirect: { destination: "/dashboard", permanent: false } };

  const raw = await prisma.project.findMany({
    where: { projectLeadId: session.user.id },
    include: {
      projectLead: { select: { name: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { deadline: "asc" },
  });

  const projects: ProjectCardData[] = raw.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const blocked = p.tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      health: p.health,
      deadline: p.deadline.toISOString(),
      doneCount: done,
      taskCount: total,
      blockedCount: blocked,
      completionPct: total === 0 ? 0 : Math.round((done / total) * 100),
      projectLead: p.projectLead,
    };
  });

  return { props: { session: serializableSession(session), projects } };
};

export default function ProjectsPage({ projects }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const header = (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-section text-text-primary">Projects</h1>
      <div className="flex items-center gap-3">
        <span className="text-meta text-text-secondary px-2 py-1 rounded-chip bg-bg-elevated">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-text-primary text-body font-semibold px-4 py-2 rounded-button transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Projects" header={header}>
      {projects.length === 0 ? (
        <p className="text-body text-text-secondary">No projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              href={`/dashboard/pl/projects/${p.id}`}
            />
          ))}
        </div>
      )}
      <ProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.replace(router.asPath)}
      />
    </DashboardLayout>
  );
}
