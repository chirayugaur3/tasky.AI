import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { NAV_BY_ROLE } from "@/lib/nav";
import { cn } from "@/lib/cn";

/**
 * Mobile bottom navigation — replaces the sidebar on screens < sm.
 * Industry call: bottom-nav over hamburger for primary nav.
 * Always reserves the last slot for Sign Out so mobile users can log out.
 */
export default function BottomNav() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  // Reserve the rightmost slot for Sign Out. With a 5-slot bar that leaves
  // 4 nav slots — sufficient for every role except PL, which loses the EOD
  // Report shortcut (still reachable from the dashboard header CTA).
  const items = (role ? NAV_BY_ROLE[role] : []).slice(0, 4);

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-surface border-t border-border-subtle flex justify-around h-14">
      {items.map((item) => {
        const isActive =
          router.pathname === item.href ||
          (item.href.split("/").length > 3 && router.pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 transition-colors",
              isActive ? "text-accent-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        );
      })}
      {role && (
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out"
          className="flex flex-col items-center justify-center gap-1 flex-1 text-text-secondary hover:text-status-danger transition-colors"
        >
          <LogOut size={20} />
          <span className="text-[10px] leading-none">Sign out</span>
        </button>
      )}
    </nav>
  );
}
