import {
  LayoutGrid,
  Folder,
  Users,
  CheckSquare,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Per-role sidebar. The Project Lead sees the most; Intern sees the least.
 * The visible shape of the chrome is itself the role contract.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  PROJECT_LEAD: [
    { href: "/dashboard/pl", label: "Dashboard", icon: LayoutGrid },
    { href: "/dashboard/pl/projects", label: "Projects", icon: Folder },
    { href: "/dashboard/pl/team", label: "Team", icon: Users },
    { href: "/dashboard/pl/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/dashboard/pl/eod", label: "EOD Report", icon: FileText },
  ],
  CEO: [
    { href: "/dashboard/executive", label: "Overview", icon: LayoutGrid },
    { href: "/dashboard/executive/projects", label: "Projects", icon: Folder },
    { href: "/dashboard/executive/team", label: "Team", icon: Users },
    { href: "/dashboard/executive/reports", label: "Reports", icon: FileText },
  ],
  CTO: [
    { href: "/dashboard/executive", label: "Overview", icon: LayoutGrid },
    { href: "/dashboard/executive/projects", label: "Projects", icon: Folder },
    { href: "/dashboard/executive/team", label: "Team", icon: Users },
    { href: "/dashboard/executive/reports", label: "Reports", icon: FileText },
  ],
  TPM: [
    { href: "/dashboard/executive", label: "Overview", icon: LayoutGrid },
    { href: "/dashboard/executive/projects", label: "Projects", icon: Folder },
    { href: "/dashboard/executive/team", label: "Team", icon: Users },
    { href: "/dashboard/executive/reports", label: "Reports", icon: FileText },
  ],
  QUALITY_LEAD: [
    { href: "/dashboard/ql", label: "Dashboard", icon: LayoutGrid },
    { href: "/dashboard/ql/reviews", label: "Reviews", icon: CheckSquare },
    { href: "/dashboard/ql/team", label: "Team", icon: Users },
  ],
  QR: [
    { href: "/dashboard/qr", label: "Review Queue", icon: CheckSquare },
    { href: "/dashboard/qr/projects", label: "Projects", icon: Folder },
  ],
  INTERN: [
    { href: "/dashboard/intern", label: "My Tasks", icon: CheckSquare },
  ],
};
