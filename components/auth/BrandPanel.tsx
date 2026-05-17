export type BrandStep = {
  number: number;
  label: string;
  state: "active" | "upcoming" | "done";
};

type Props = {
  headline: string;
  subtitle: string;
  steps?: BrandStep[];
};

export function BrandPanel({ headline, subtitle, steps }: Props) {
  return (
    <aside
      className="relative hidden md:flex md:w-1/2 min-h-screen bg-[#0D0D14] overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Vivid overhead purple glow — bright, soft-edged lavender at the top
          that bleeds down into deep purple, then falls off to black past the midline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            // Bright lavender core — concentrated near top, soft white-purple center
            "radial-gradient(ellipse 70% 55% at 50% 5%, rgba(200,170,255,0.95) 0%, rgba(170,120,250,0.75) 18%, rgba(140,80,240,0.45) 38%, rgba(90,40,180,0.20) 60%, transparent 80%)",
            // Wider purple halo — extends the bleed outward and downward
            "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(150,90,240,0.55) 0%, rgba(110,60,210,0.25) 35%, transparent 70%)",
          ].join(", "),
        }}
      />

      {/* Bottom-half black wash — pulls the lower portion to near-pure black so
          the purple reads as a glow rather than an even tint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      <div className="relative z-10 w-full flex flex-col items-center justify-end px-12 pb-[6vh]">
        <div className="w-full max-w-[420px] flex flex-col items-center text-center">
          {/* Brand mark — circle outline with offset dot, evokes the reference */}
          <div className="flex items-center gap-[10px]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="9.5" stroke="#EEEEF5" strokeWidth="1.5" />
              <circle cx="11" cy="11" r="3.5" fill="#EEEEF5" />
            </svg>
            <span className="font-semibold text-[16px] text-[#EEEEF5] tracking-[-0.01em]">
              Tasky.AI
            </span>
          </div>

          <h2
            className="mt-6 font-bold text-[34px] text-[#EEEEF5]"
            style={{ letterSpacing: "-0.6px", lineHeight: 1.15 }}
          >
            {headline}
          </h2>

          <p className="mt-3 text-[15px] text-[#7878A0] leading-[1.5] max-w-[320px]">
            {subtitle}
          </p>

          {steps && steps.length > 0 && (
            <ol className="mt-10 w-full flex flex-col gap-3">
              {steps.map((step) => (
                <StepCard key={step.number} step={step} />
              ))}
            </ol>
          )}
        </div>
      </div>
    </aside>
  );
}

function StepCard({ step }: { step: BrandStep }) {
  if (step.state === "active") {
    return (
      <li className="flex items-center gap-3 bg-[#EEEEF5] rounded-[10px] px-4 py-[14px] text-left">
        <span className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[#13131E] text-[12px] font-semibold text-[#EEEEF5] shrink-0">
          {step.number}
        </span>
        <span className="text-[14px] font-medium text-[#13131E]">{step.label}</span>
      </li>
    );
  }

  const isDone = step.state === "done";
  return (
    <li className="flex items-center gap-3 bg-[#1C1C2E] border border-[rgba(255,255,255,0.05)] rounded-[10px] px-4 py-[14px] text-left">
      <span
        className={[
          "flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[#0D0D14] border border-[rgba(255,255,255,0.08)] text-[12px] font-medium shrink-0",
          isDone ? "text-[#7B6EF6]" : "text-[#7878A0]",
        ].join(" ")}
      >
        {isDone ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2.5 6.2L4.8 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          step.number
        )}
      </span>
      <span className="text-[14px] text-[#7878A0]">{step.label}</span>
    </li>
  );
}
