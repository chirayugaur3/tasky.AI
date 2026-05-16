import type { GetServerSideProps } from "next";
import { useState } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { Sparkles, Info } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { formatLongDate } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";

type ProjectOption = { id: string; name: string };

type Report = {
  completedToday: string[];
  activeBlockers: string[];
  tomorrowFocus: string[];
};

type Props = {
  session: Session;
  today: string;
  projects: ProjectOption[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) return { redirect: { destination: "/login", permanent: false } };
  if (session.user.role !== Role.PROJECT_LEAD) return { redirect: { destination: "/dashboard", permanent: false } };

  const projects = await prisma.project.findMany({
    where: { projectLeadId: session.user.id },
    select: { id: true, name: true },
    orderBy: { deadline: "asc" },
  });

  return {
    props: {
      session: serializableSession(session),
      today: formatLongDate(new Date()),
      projects,
    },
  };
};

function Skeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="skeleton h-3 w-32 rounded-chip" />
          <div className="skeleton h-4 w-full rounded-chip" />
          <div className="skeleton h-4 w-5/6 rounded-chip" />
          <div className="skeleton h-4 w-2/3 rounded-chip" />
        </div>
      ))}
    </div>
  );
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-l-[3px] border-l-accent-primary pl-4">
      <p className="text-meta text-text-secondary tracking-section uppercase font-medium mb-2">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.length === 0 ? (
          <li className="text-body text-text-disabled italic">Nothing to report.</li>
        ) : (
          items.map((item, i) => (
            <li key={i} className="text-body text-text-primary">• {item}</li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function EODPage({ today, projects }: Props) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function generate() {
    if (!projectId) return;
    setError(null);
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/eod/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, context }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate report");
      setReport(json.data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <div className="flex flex-col">
      <h1 className="text-section text-text-primary">EOD Report</h1>
      <p className="text-meta text-text-secondary">{today}</p>
    </div>
  );

  return (
    <DashboardLayout title="EOD Report" header={header}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — CONTEXT */}
        <div className="bg-bg-surface border border-border-subtle rounded-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-meta text-text-secondary tracking-section uppercase font-medium">Context</p>
            <Info size={14} className="text-text-disabled" />
          </div>
          <p className="text-body text-text-secondary leading-relaxed">
            Provide raw updates, bullet points, or stream-of-consciousness notes. Tasky.AI
            will structure it into a formal EOD report.
          </p>

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-bg-elevated border border-border-default rounded-card px-3 py-2 text-meta text-text-primary outline-none focus:border-accent-primary"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={10}
            placeholder="e.g., Finished the UI designs for the reporting module. Had a sync with backend about API payloads. Blocked on the staging environment deployment."
            className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors resize-none flex-1 min-h-[200px]"
          />

          {error && <p className="text-meta text-status-danger">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <span className="flex items-center gap-1.5 text-meta text-text-disabled">
              <Sparkles size={12} /> Powered by Tasky.AI
            </span>
            <button
              onClick={generate}
              disabled={loading || !projectId}
              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-text-primary text-body font-semibold px-5 py-2.5 rounded-button transition-colors"
            >
              <Sparkles size={14} /> {loading ? "Generating…" : "Generate Report"}
            </button>
          </div>
        </div>

        {/* RIGHT — REPORT */}
        <div className="bg-bg-surface border border-border-subtle rounded-card p-6 min-h-[460px] flex flex-col gap-4 bg-dot-grid">
          {loading && <Skeleton />}
          {!loading && !report && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-accent-subtle border border-accent-primary/30 flex items-center justify-center">
                <span className="text-accent-primary text-section font-semibold">EA</span>
              </div>
              <p className="text-body text-text-secondary">Your report will appear here.</p>
            </div>
          )}
          {report && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-meta text-text-secondary tracking-section uppercase font-medium">
                  Generated Report
                </p>
                <span className="text-meta text-text-secondary bg-bg-elevated px-2 py-1 rounded-chip">
                  {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <ReportSection title="Completed Today" items={report.completedToday} />
              <ReportSection title="Active Blockers" items={report.activeBlockers} />
              <ReportSection title="Tomorrow's Focus" items={report.tomorrowFocus} />
              <button className="mt-auto w-full bg-accent-primary hover:bg-accent-hover text-text-primary text-body font-semibold py-3 rounded-button transition-colors">
                Submit Report
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
