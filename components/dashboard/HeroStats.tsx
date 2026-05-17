type Props = {
  total: number;
  inProgress: number;
  blocked: number;
};

export default function HeroStats({ total, inProgress, blocked }: Props) {
  const hasBlockers = blocked > 0;
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <StatCard
        label="TOTAL TASKS"
        value={total}
        valueColor="#EEEEF5"
        descriptor="total across all projects"
        descriptorColor="#7878A0"
      />
      <StatCard
        label="IN PROGRESS"
        value={inProgress}
        valueColor="#FB923C"
        descriptor="actively being worked on"
        descriptorColor="#7878A0"
      />
      <StatCard
        label="BLOCKED"
        value={blocked}
        valueColor="#F87171"
        descriptor={hasBlockers ? "requires your attention" : "all clear"}
        descriptorColor={hasBlockers ? "#F87171" : "rgba(74,222,128,0.9)"}
        bgTint={hasBlockers ? "rgba(248,113,113,0.04)" : undefined}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor,
  descriptor,
  descriptorColor,
  bgTint,
}: {
  label: string;
  value: number;
  valueColor: string;
  descriptor: string;
  descriptorColor: string;
  bgTint?: string;
}) {
  return (
    <div
      className="flex-1 rounded-[8px] border border-[rgba(255,255,255,0.06)] px-5 py-4"
      style={{ background: bgTint ?? "#13131E" }}
    >
      <div
        className="text-[11px] uppercase font-medium text-[#7878A0]"
        style={{ letterSpacing: "0.12em" }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-[36px] font-bold tabular-nums leading-none"
        style={{ color: valueColor, letterSpacing: "-0.8px" }}
      >
        {value}
      </div>
      <div
        className="mt-2 text-[12px]"
        style={{ color: descriptorColor }}
      >
        {descriptor}
      </div>
    </div>
  );
}
