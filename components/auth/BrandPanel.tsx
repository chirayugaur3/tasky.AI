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
      {/* Overhead spotlight + faint bottom counter-bleed.
          Brightest at the top edge, falls off fast so cards sit on their own dark ground. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            // Bottom counter-bleed — barely-there purple wash so cards don't float in dead black
            "radial-gradient(ellipse 80% 30% at 50% 100%, rgba(123,110,246,0.05) 0%, transparent 70%)",
            // Main overhead spotlight — large, originates just above the panel
            "radial-gradient(ellipse 110% 70% at 50% -10%, rgba(123,110,246,0.55) 0%, rgba(123,110,246,0.20) 25%, rgba(123,110,246,0.06) 50%, transparent 75%)",
          ].join(", "),
        }}
      />

      {/* Bottom vignette — adds a hair of depth below the cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.30) 100%)",
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
