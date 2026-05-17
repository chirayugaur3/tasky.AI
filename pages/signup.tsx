import { useState } from "react";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";
import { Eye, EyeOff } from "lucide-react";
import { BrandPanel, type BrandStep } from "@/components/auth/BrandPanel";

type RoleChoice =
  | "CEO"
  | "CTO"
  | "TPM"
  | "PROJECT_LEAD"
  | "QUALITY_LEAD"
  | "QR"
  | "INTERN";

const ROLE_CHIPS: { value: RoleChoice; label: string }[] = [
  { value: "CEO", label: "CEO" },
  { value: "CTO", label: "CTO" },
  { value: "TPM", label: "TPM" },
  { value: "PROJECT_LEAD", label: "Project Lead" },
  { value: "QUALITY_LEAD", label: "Quality Lead" },
  { value: "QR", label: "QR" },
  { value: "INTERN", label: "Intern" },
];

const SIGNUP_STEPS: BrandStep[] = [
  { number: 1, label: "Sign up your account", state: "active" },
  { number: 2, label: "Set up your workspace", state: "upcoming" },
  { number: 3, label: "Set up your profile", state: "upcoming" },
];

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user?.role) {
    return {
      redirect: { destination: ROLE_HOME[session.user.role as Role], permanent: false },
    };
  }
  return { props: {} };
};

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) {
      setError("Select your role.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    // Request access flows through an admin — no auto-provisioned account.
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen w-full flex">
      <BrandPanel
        headline="Get Started with Us"
        subtitle="Complete these easy steps to register your account."
        steps={SIGNUP_STEPS}
      />

      <div className="flex-1 min-h-screen flex items-center justify-center bg-[#13131E]">
        <div className="w-full max-w-[440px] px-6 py-12">
          {/* Mobile brand mark */}
          <div className="md:hidden mb-8 flex items-center gap-[10px]">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="9.5" stroke="#EEEEF5" strokeWidth="1.5" />
              <circle cx="11" cy="11" r="3.5" fill="#EEEEF5" />
            </svg>
            <span className="font-semibold text-[16px] text-[#EEEEF5]">Tasky.AI</span>
          </div>

          {submitted ? (
            <RequestSent firstName={firstName} />
          ) : (
            <>
              <div className="text-center">
                <h1
                  className="font-bold text-[28px] text-[#EEEEF5]"
                  style={{ letterSpacing: "-0.5px" }}
                >
                  Sign Up Account
                </h1>
                <p className="mt-2 text-[14px] text-[#7878A0]">
                  Enter your personal data to request your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="text-[13px] font-medium text-[#EEEEF5]"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="eg. John"
                      className="mt-2 w-full bg-[#1C1C2E] border border-[rgba(255,255,255,0.10)] rounded-[8px] px-4 py-[13px] text-[14px] text-[#EEEEF5] placeholder:text-[#3D3D55] outline-none focus:border-[#7B6EF6] transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="text-[13px] font-medium text-[#EEEEF5]"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="eg. Cooper"
                      className="mt-2 w-full bg-[#1C1C2E] border border-[rgba(255,255,255,0.10)] rounded-[8px] px-4 py-[13px] text-[14px] text-[#EEEEF5] placeholder:text-[#3D3D55] outline-none focus:border-[#7B6EF6] transition-colors"
                    />
                  </div>
                </div>

                <label
                  htmlFor="email"
                  className="mt-4 text-[13px] font-medium text-[#EEEEF5]"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eg. you@ethara.ai"
                  className="mt-2 bg-[#1C1C2E] border border-[rgba(255,255,255,0.10)] rounded-[8px] px-4 py-[13px] text-[14px] text-[#EEEEF5] placeholder:text-[#3D3D55] outline-none focus:border-[#7B6EF6] transition-colors"
                />

                <label
                  htmlFor="password"
                  className="mt-4 text-[13px] font-medium text-[#EEEEF5]"
                >
                  Password
                </label>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#1C1C2E] border border-[rgba(255,255,255,0.10)] rounded-[8px] px-4 py-[13px] pr-11 text-[14px] text-[#EEEEF5] placeholder:text-[#3D3D55] outline-none focus:border-[#7B6EF6] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3D3D55] hover:text-[#7878A0] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-[#7878A0]">
                  Must be at least 8 characters.
                </p>

                <div className="mt-5">
                  <span className="text-[13px] font-medium text-[#EEEEF5]">Role</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLE_CHIPS.map((chip) => {
                      const active = role === chip.value;
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => setRole(chip.value)}
                          className={[
                            "px-[14px] py-2 rounded-[6px] text-[13px] border transition-colors duration-150",
                            active
                              ? "bg-[rgba(123,110,246,0.12)] border-[#7B6EF6] text-[#EEEEF5]"
                              : "bg-[#1C1C2E] border-[rgba(255,255,255,0.08)] text-[#7878A0] hover:text-[#EEEEF5]",
                          ].join(" ")}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <p className="mt-3 text-[12px] text-[rgba(248,113,113,0.9)]" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-6 w-full bg-[#EEEEF5] hover:bg-white active:scale-[0.99] text-[#0D0D14] font-semibold text-[14px] py-[13px] rounded-[8px] transition-all duration-150"
                >
                  Sign Up
                </button>

                <p className="mt-5 text-center text-[13px] text-[#7878A0]">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#EEEEF5] font-medium hover:underline">
                    Log in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestSent({ firstName }: { firstName: string }) {
  return (
    <div className="text-center">
      <h1
        className="font-bold text-[28px] text-[#EEEEF5]"
        style={{ letterSpacing: "-0.5px" }}
      >
        Request sent.
      </h1>
      <p className="mt-3 text-[14px] text-[#7878A0]">
        Thanks{firstName ? `, ${firstName}` : ""}. An admin has been notified and will
        activate your account shortly.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block w-full text-center bg-[#EEEEF5] hover:bg-white active:scale-[0.99] text-[#0D0D14] font-semibold text-[14px] py-[13px] rounded-[8px] transition-all duration-150"
      >
        Back to sign in
      </Link>
    </div>
  );
}
