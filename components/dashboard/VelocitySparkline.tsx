import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

type SparkPayloadItem = { value?: number };
type SparkTooltipProps = {
  active?: boolean;
  payload?: SparkPayloadItem[];
};

type Point = { date: string; completedCount: number };

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; series: Point[] };

export default function VelocitySparkline() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tasks/velocity")
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.error || !Array.isArray(res.data)) {
          setState({ status: "error" });
          return;
        }
        setState({ status: "ok", series: res.data as Point[] });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <div className="h-7 w-10 skeleton rounded" />
          <div className="h-3 w-32 skeleton rounded" />
        </div>
        <div className="h-[72px] w-full skeleton rounded" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-[12px] text-[#7878A0]">Velocity data unavailable.</p>
    );
  }

  const series = state.series;
  const thisWeekTotal = series.reduce((sum, p) => sum + p.completedCount, 0);

  // "Last week" = the 7 days prior to this 7-day window.
  // We don't have it server-side here, so we omit the comparison line when
  // we can't compute it — keep the trend hint additive, not load-bearing.
  // (Server-side comparison is computed in pl.tsx and passed via velocityCompare prop below.)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-bold text-[#EEEEF5] leading-none tabular-nums">
          {thisWeekTotal}
        </span>
        <span className="text-[11px] text-[#7878A0]">completed this week</span>
      </div>

      <div className="h-[72px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(123,110,246,0.18)" />
                <stop offset="100%" stopColor="rgba(123,110,246,0.02)" />
              </linearGradient>
            </defs>
            <Tooltip content={<SparkTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="completedCount"
              stroke="#7B6EF6"
              strokeWidth={1.5}
              fill="url(#velocityFill)"
              dot={false}
              activeDot={{ r: 4, fill: "#7B6EF6", stroke: "#7B6EF6" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SparkTooltip({ active, payload }: SparkTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background: "#1C1C2E",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        padding: "6px 10px",
        color: "#EEEEF5",
        fontSize: 12,
      }}
    >
      {value} {value === 1 ? "task" : "tasks"}
    </div>
  );
}
