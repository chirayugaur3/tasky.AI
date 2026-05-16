import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { NAV_BY_ROLE } from "@/lib/nav";
import { cn } from "@/lib/cn";

function initials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}

const ROLE_BADGE: Record<string, string> = {
  PROJECT_LEAD: "PL",
  CEO: "CE",
  CTO: "CT",
  TPM: "TP",
  QUALITY_LEAD: "QL",
  QR: "QR",
  INTERN: "IN",
};

/**
 * Desktop sidebar — collapsed 48px, expands to 220px on hover.
 * Group-hover Tailwind pattern so the icon column never reflows.
 */
export default function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const items = role ? NAV_BY_ROLE[role] : [];

  return (
    <aside
      className="group hidden sm:flex flex-col bg-bg-surface border-r border-border-subtle h-screen sticky top-0 transition-[width] duration-150 ease-out overflow-hidden"
      style={{ width: "48px" }}
      onMouseEnter={(e) => (e.currentTarget.style.width = "220px")}
      onMouseLeave={(e) => (e.currentTarget.style.width = "48px")}
    >
      {/* Brand chip */}
      <div className="flex items-center h-12 px-2 shrink-0">
        <div className="w-8 h-8 rounded-chip bg-accent-subtle flex items-center justify-center text-accent-primary text-meta font-semibold shrink-0">
          EA
        </div>
        <span className="ml-3 text-ui text-text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Tasky.AI
        </span>
      </div>

      <nav className="flex flex-col gap-1 mt-4 px-2 flex-1">
        {items.map((item) => {
          const isActive =
            router.pathname === item.href ||
            (item.href !== "/dashboard/pl" &&
              item.href !== "/dashboard/executive" &&
              item.href !== "/dashboard/ql" &&
              item.href !== "/dashboard/qr" &&
              item.href !== "/dashboard/intern" &&
              router.pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center h-10 rounded-button px-2 transition-colors",
                isActive
                  ? "bg-accent-subtle text-accent-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] bg-accent-primary rounded-full" />
              )}
              <Icon size={20} className="shrink-0" />
              <span className="ml-3 text-body opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Identity + sign out — anchored to the bottom */}
      <div className="px-2 pb-3 mt-2 flex flex-col gap-1">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center h-10 rounded-button px-2 text-text-secondary hover:text-status-danger hover:bg-bg-elevated transition-colors"
          title="Sign out"
        >
          <LogOut size={20} className="shrink-0" />
          <span className="ml-3 text-body opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Sign out
          </span>
        </button>
        <div className="flex items-center h-10 px-2">
          <div className="w-8 h-8 rounded-chip bg-bg-elevated flex items-center justify-center text-text-secondary text-meta font-medium shrink-0">
            {role ? ROLE_BADGE[role] ?? "??" : "??"}
          </div>
          <div className="ml-3 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <span className="text-body text-text-primary leading-tight">
              {session?.user?.name ?? "Loading…"}
            </span>
            <span className="text-meta text-text-secondary leading-tight">
              {initials(session?.user?.name)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
