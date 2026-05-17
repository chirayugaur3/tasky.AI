import type { GetServerSideProps } from "next";
import { useState } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { Sparkles, Copy, Check } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializableSession } from "@/lib/session-utils";
import { formatLongDate } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";

type ProjectOption = { id: string; name: string };

type Report = {
  formattedText: string;
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
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="skeleton h-4 w-full rounded-chip" />
      ))}
    </div>
  );
}

const CONTEXT_PLACEHOLDER = `e.g.,
29 members working, 22 interns, 7 FTs.
65 tasks delivered on Multimango.
Newly onboarded interns introduced to Odoo workflow. They shadowed ongoing tasks while working alongside their allocated peers to maintain quality.
CC: vyom sahu`;

export default function EODPage({ today, projects }: Props) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!projectId) return;
    setError(null);
    setLoading(true);
    setReport(null);
    setCopied(false);
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

  async function copyToClipboard() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard");
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
          <p className="text-meta text-text-secondary tracking-section uppercase font-medium">Context</p>

          <div className="text-body text-text-secondary leading-relaxed flex flex-col gap-2">
            <p>Provide your raw EOD notes. Include all of:</p>
            <ol className="list-decimal pl-5 flex flex-col gap-1 text-meta text-text-secondary">
              <li><span className="text-text-primary">Headcount:</span> total members working, interns, FTs, on-leave</li>
              <li><span className="text-text-primary">Delivery:</span> tasks delivered/submitted + platform (Multimango, Odoo…)</li>
              <li><span className="text-text-primary">Operational notes:</span> onboarding, platform issues, evaluations, shadowing</li>
              <li><span className="text-text-primary">CC:</span> manager name (with or without @)</li>
            </ol>
          </div>

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
            placeholder={CONTEXT_PLACEHOLDER}
            className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors resize-none flex-1 min-h-[200px] font-mono text-sm"
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
        <div className="bg-bg-surface border border-border-subtle rounded-card p-6 min-h-[460px] flex flex-col gap-4">
          {loading && <Skeleton />}
          {!loading && !report && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-accent-subtle border border-accent-primary/30 flex items-center justify-center">
                <span className="text-accent-primary text-section font-semibold">EA</span>
              </div>
              <p className="text-body text-text-secondary">Your report will appear here.</p>
              <p className="text-meta text-text-disabled">Ready to paste into WhatsApp/Slack.</p>
            </div>
          )}
          {report && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-meta text-text-secondary tracking-section uppercase font-medium">
                  Generated Report
                </p>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 text-meta text-text-primary bg-bg-elevated hover:bg-bg-primary border border-border-default px-3 py-1.5 rounded-chip transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="flex-1 bg-bg-elevated border border-border-subtle rounded-card p-4 text-body text-text-primary font-mono text-sm whitespace-pre-wrap leading-relaxed overflow-auto">
                {report.formattedText}
              </pre>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
