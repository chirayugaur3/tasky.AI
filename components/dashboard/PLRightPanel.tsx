import { Flag } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/cn";
import VelocitySparkline from "@/components/dashboard/VelocitySparkline";

type Member = {
  userId: string;
  name: string;
  isPresent: boolean;
};

type Props = {
  members: Member[];
  velocity: { thisWeek: number; lastWeek: number };
  forecast: { confidence80: Date | string | null; confidence95: Date | string | null };
  onGenerateEOD?: () => void;
  lastGeneratedAt?: Date | string | null;
};

function formatForecastDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "MMM d");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-meta text-text-secondary tracking-section uppercase font-medium">
      {children}
    </p>
  );
}

function VelocityTrend({
  thisWeek,
  lastWeek,
}: {
  thisWeek: number;
  lastWeek: number;
}) {
  if (thisWeek === lastWeek) return null;
  if (thisWeek > lastWeek) {
    return (
      <p className="text-[12px]" style={{ color: "rgba(74,222,128,0.9)" }}>
        ↑ More than last week
      </p>
    );
  }
  return <p className="text-[12px] text-[#F87171]">↓ Slower than last week</p>;
}

export default function PLRightPanel({
  members,
  velocity,
  forecast,
  onGenerateEOD,
  lastGeneratedAt,
}: Props) {
  return (
    <div className="flex flex-col gap-8 h-full">
      {/* TEAM STATUS — cap to 6 (absent first, then active) so PL sees risk fast */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Team Status</SectionLabel>
        <div className="flex flex-col">
          {members.length === 0 && (
            <p className="text-meta text-text-disabled">No members assigned.</p>
          )}
          {[...members]
            .sort((a, b) => Number(a.isPresent) - Number(b.isPresent))
            .slice(0, 6)
            .map((m) => (
              <div
                key={m.userId}
                className={cn(
                  "flex items-center justify-between py-1.5 px-2 -mx-2 rounded-button",
                  !m.isPresent && "bg-[rgba(248,113,113,0.05)]"
                )}
              >
                <span className="text-body text-text-primary truncate">{m.name}</span>
                <span
                  className={cn(
                    "text-meta font-medium shrink-0 ml-3",
                    m.isPresent ? "text-status-success" : "text-status-danger"
                  )}
                >
                  {m.isPresent ? "Active" : "Absent"}
                </span>
              </div>
            ))}
          {members.length > 6 && (
            <p className="text-meta text-text-disabled mt-1 px-2">
              + {members.length - 6} more
            </p>
          )}
        </div>
      </section>

      {/* VELOCITY — sparkline of last 7 days, with this-vs-last week trend */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Velocity</SectionLabel>
        <div className="bg-bg-elevated rounded-card border border-border-subtle p-4 flex flex-col gap-2">
          <VelocitySparkline />
          <VelocityTrend
            thisWeek={velocity.thisWeek}
            lastWeek={velocity.lastWeek}
          />
        </div>
      </section>

      {/* ON TRACK */}
      <section className="flex flex-col gap-3">
        <SectionLabel>On Track</SectionLabel>
        <div className="bg-bg-elevated rounded-card border border-border-subtle p-4 flex flex-col gap-2 relative">
          <Flag
            size={16}
            className="absolute top-3 right-3 text-text-secondary"
            strokeWidth={1.5}
          />
          <div className="flex items-baseline gap-2">
            <span className="text-stat text-text-primary">80%</span>
            <span className="text-body text-text-secondary">
              by {formatForecastDate(forecast.confidence80)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-body text-text-secondary">95% by</span>
            <span className="text-body text-text-primary">
              {formatForecastDate(forecast.confidence95)}
            </span>
          </div>
          <p className="text-meta text-text-secondary mt-2">
            Probability range based on current velocity and active blockers.
          </p>
        </div>
      </section>

      {/* EOD BUTTON */}
      <section className="mt-auto flex flex-col gap-2">
        {lastGeneratedAt && (
          <p className="text-meta text-text-disabled text-right">
            Last generated:{" "}
            {format(
              typeof lastGeneratedAt === "string"
                ? new Date(lastGeneratedAt)
                : lastGeneratedAt,
              "HH:mm"
            )}
          </p>
        )}
        <button
          onClick={onGenerateEOD}
          className="w-full bg-accent-primary hover:bg-accent-hover text-text-primary text-body font-semibold py-3 rounded-button transition-colors"
        >
          Generate EOD Report
        </button>
      </section>
    </div>
  );
}
