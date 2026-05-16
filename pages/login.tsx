import { useState } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions, isGoogleConfigured } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

type DemoAccount = { label: string; sublabel: string; email: string };
const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: "Admin", sublabel: "Project Lead — full operations view", email: "pl@ethara.ai" },
  { label: "User", sublabel: "Intern — my tasks only", email: "intern@ethara.ai" },
];
const DEMO_PASSWORD = "ethara.ai";

type Props = { googleEnabled: boolean };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user?.role) {
    return {
      redirect: { destination: ROLE_HOME[session.user.role as Role], permanent: false },
    };
  }
  return { props: { googleEnabled: isGoogleConfigured } };
};

export default function LoginPage({ googleEnabled }: Props) {
  const router = useRouter();
  const callbackUrl = typeof router.query.callbackUrl === "string" ? router.query.callbackUrl : undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl ?? "/",
    });
    setLoading(false);
    if (!result || result.error) {
      setError("Invalid credentials. Try one of the demo accounts below.");
      return;
    }
    // Redirect lands at "/" which middleware then bounces to the role home.
    window.location.href = result.url ?? "/";
  }

  function fillDemo(account: DemoAccount) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="min-h-screen w-full bg-bg-primary bg-dot-grid flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        {/* Card */}
        <div className="bg-bg-surface border border-border-subtle rounded-card p-8 sm:p-10">
          {/* Wordmark */}
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-section text-text-primary">Tasky.AI</h1>
            <p className="text-meta text-text-secondary tracking-wordmark uppercase">
              An intelligent manager who handles your tasks
            </p>
          </div>

          <div className="my-8 border-t border-border-subtle" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-meta text-text-secondary tracking-section uppercase font-medium"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@ethara.ai"
                className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-meta text-text-secondary tracking-section uppercase font-medium"
              >
                Passcode
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            {error && (
              <p className="text-meta text-status-danger" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-accent-primary hover:bg-accent-hover text-text-primary text-body font-semibold py-3 rounded-button transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

            {googleEnabled && (
              <>
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 border-t border-border-subtle" />
                  <span className="text-meta text-text-secondary uppercase tracking-section">or</span>
                  <div className="flex-1 border-t border-border-subtle" />
                </div>
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: callbackUrl ?? "/" })}
                  className="w-full bg-bg-elevated border border-border-default hover:border-text-secondary text-text-primary text-body font-medium py-3 rounded-button transition-colors"
                >
                  Continue with Google
                </button>
              </>
            )}

            <p className="text-meta text-text-secondary text-center mt-2">
              Don&apos;t have access? Request it.
            </p>
          </form>
        </div>

        {/* Two-track demo: Admin (Project Lead) vs User (Intern) */}
        <div className="flex flex-col gap-3 px-2">
          <p className="text-meta text-text-disabled uppercase tracking-section text-center">
            Or continue as
          </p>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc)}
                className="flex flex-col items-start gap-1 bg-bg-surface border border-border-default hover:border-accent-primary hover:bg-accent-subtle text-left px-4 py-3 rounded-card transition-colors group"
              >
                <span className="text-ui text-text-primary group-hover:text-accent-primary transition-colors">
                  {acc.label}
                </span>
                <span className="text-meta text-text-secondary">{acc.sublabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
