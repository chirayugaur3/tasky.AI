import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { NAV_BY_ROLE } from "@/lib/nav";
import { cn } from "@/lib/cn";

/**
 * Mobile bottom navigation — replaces the sidebar on screens < sm.
 * Industry call: bottom-nav over hamburger for primary nav.
 */
export default function BottomNav() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const items = role ? NAV_BY_ROLE[role] : [];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-surface border-t border-border-subtle flex justify-around h-14">
      {items.slice(0, 5).map((item) => {
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
    </nav>
  );
}
