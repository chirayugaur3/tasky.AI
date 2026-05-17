import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";
import { Eye, EyeOff } from "lucide-react";
import { BrandPanel, type BrandStep } from "@/components/auth/BrandPanel";

const DEMO_PASSWORD = "ethara.ai";
const DEMO_ACCOUNTS = {
  pl: { email: "pl@ethara.ai", password: DEMO_PASSWORD },
  intern: { email: "intern@ethara.ai", password: DEMO_PASSWORD },
} as const;

const LOGIN_STEPS: BrandStep[] = [
  { number: 1, label: "Sign up your account", state: "done" },
  { number: 2, label: "Set up your workspace", state: "done" },
  { number: 3, label: "Set up your profile", state: "done" },
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

export default function LoginPage() {
  const router = useRouter();
  const callbackUrl =
    typeof router.query.callbackUrl === "string" ? router.query.callbackUrl : undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(emailValue: string, passwordValue: string) {
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email: emailValue,
      password: passwordValue,
      redirect: false,
      callbackUrl: callbackUrl ?? "/",
    });
    setLoading(false);
    if (!result || result.error) {
      setError("Invalid credentials. Please try again.");
      return;
    }
    window.location.href = result.url ?? "/";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit(email, password);
  }

  function runQuickAccess(account: { email: string; password: string }) {
    setEmail(account.email);
    setPassword(account.password);
    void submit(account.email, account.password);
  }

  return (
    <div className="min-h-screen w-full flex">
      <BrandPanel
        headline="Welcome back."
        subtitle="Your operations dashboard is one click away. Pick up exactly where you left off."
        steps={LOGIN_STEPS}
      />

      <div className="flex-1 min-h-screen flex items-center justify-center bg-[#13131E]">
        <div className="w-full max-w-[400px] px-6 py-12">
          {/* Mobile brand mark — shown when BrandPanel is hidden */}
          <div className="md:hidden mb-8 flex items-center gap-[10px]">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="9.5" stroke="#EEEEF5" strokeWidth="1.5" />
              <circle cx="11" cy="11" r="3.5" fill="#EEEEF5" />
            </svg>
            <span className="font-semibold text-[16px] text-[#EEEEF5]">Tasky.AI</span>
          </div>

          <div className="text-center">
            <h1
              className="font-bold text-[28px] text-[#EEEEF5]"
              style={{ letterSpacing: "-0.5px" }}
            >
              Sign in to your account
            </h1>
            <p className="mt-2 text-[14px] text-[#7878A0]">
              Enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 flex flex-col">
            <label
              htmlFor="email"
              className="text-[13px] font-medium text-[#EEEEF5]"
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
              placeholder="you@ethara.ai"
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
                autoComplete="current-password"
                required
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

            {error && (
              <p className="mt-3 text-[12px] text-[rgba(248,113,113,0.9)]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-[#EEEEF5] hover:bg-white active:scale-[0.99] text-[#0D0D14] font-semibold text-[14px] py-[13px] rounded-[8px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

            <div className="mt-8 relative flex items-center">
              <div className="flex-1 border-t border-[rgba(255,255,255,0.06)]" />
              <span
                className="px-3 text-[11px] text-[#3D3D55]"
                style={{ letterSpacing: "0.15em" }}
              >
                QUICK ACCESS
              </span>
              <div className="flex-1 border-t border-[rgba(255,255,255,0.06)]" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => runQuickAccess(DEMO_ACCOUNTS.pl)}
                disabled={loading}
                className="group flex flex-col items-start gap-1 bg-transparent border border-[rgba(255,255,255,0.08)] hover:border-[rgba(123,110,246,0.4)] rounded-[8px] px-4 py-[10px] text-left transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-[13px] font-medium text-[#7878A0] group-hover:text-[#EEEEF5] transition-colors">
                  Project Lead
                </span>
                <span className="text-[11px] text-[#3D3D55]">Full operations view</span>
              </button>
              <button
                type="button"
                onClick={() => runQuickAccess(DEMO_ACCOUNTS.intern)}
                disabled={loading}
                className="group flex flex-col items-start gap-1 bg-transparent border border-[rgba(255,255,255,0.08)] hover:border-[rgba(123,110,246,0.4)] rounded-[8px] px-4 py-[10px] text-left transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-[13px] font-medium text-[#7878A0] group-hover:text-[#EEEEF5] transition-colors">
                  Intern
                </span>
                <span className="text-[11px] text-[#3D3D55]">My tasks only</span>
              </button>
            </div>

            <p className="mt-6 text-center text-[13px] text-[#7878A0]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#EEEEF5] font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
