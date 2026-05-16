import type { ReactNode } from "react";
import Head from "next/head";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

type Props = {
  children: ReactNode;
  /** Optional page-level header content (greeting, date, CTA). Renders flush at top of the content column. */
  header?: ReactNode;
  /** Optional right-side intelligence/utility panel. Hidden on mobile by default. */
  rightPanel?: ReactNode;
  /** Page title in the browser tab. */
  title?: string;
};

/**
 * The dashboard chrome. Three columns on ≥lg: sidebar | content | right panel.
 * Two columns on sm–md: sidebar | content.
 * Single column + bottom nav on mobile.
 */
export default function DashboardLayout({ children, header, rightPanel, title }: Props) {
  return (
    <>
      <Head>
        <title>{title ? `${title} · Tasky.AI` : "Tasky.AI"}</title>
      </Head>
      <div className="min-h-screen flex bg-bg-primary text-text-primary">
        <Sidebar />

        {/* Content column */}
        <div className="flex-1 flex flex-col min-w-0">
          {header && (
            <div className="border-b border-border-subtle px-6 sm:px-8 py-4">
              {header}
            </div>
          )}
          <main className="flex-1 px-4 sm:px-8 py-6 pb-20 sm:pb-6 min-w-0">
            {children}
          </main>
        </div>

        {/* Right intelligence panel — desktop only by default */}
        {rightPanel && (
          <aside className="hidden lg:flex w-[320px] shrink-0 bg-bg-surface border-l border-border-subtle p-6 flex-col overflow-y-auto h-screen sticky top-0">
            {rightPanel}
          </aside>
        )}

        <BottomNav />
      </div>
    </>
  );
}
