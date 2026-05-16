import { Role } from "@prisma/client";

/**
 * Map of every Role → its home dashboard path.
 * Executive roles (CEO/CTO/TPM) share /dashboard/executive.
 */
export const ROLE_HOME: Record<Role, string> = {
  CEO: "/dashboard/executive",
  CTO: "/dashboard/executive",
  TPM: "/dashboard/executive",
  PROJECT_LEAD: "/dashboard/pl",
  QUALITY_LEAD: "/dashboard/ql",
  QR: "/dashboard/qr",
  INTERN: "/dashboard/intern",
};

/** Path prefixes a given role is allowed to access. */
export const ROLE_PATHS: Record<Role, string[]> = {
  CEO: ["/dashboard/executive"],
  CTO: ["/dashboard/executive"],
  TPM: ["/dashboard/executive"],
  PROJECT_LEAD: ["/dashboard/pl"],
  QUALITY_LEAD: ["/dashboard/ql"],
  QR: ["/dashboard/qr"],
  INTERN: ["/dashboard/intern"],
};

export function homePathForRole(role: Role): string {
  return ROLE_HOME[role];
}

export function canAccessPath(role: Role, pathname: string): boolean {
  return ROLE_PATHS[role].some((prefix) => pathname.startsWith(prefix));
}

/** Human-readable role labels for UI chips and badges. */
export const ROLE_LABELS: Record<Role, string> = {
  CEO: "CEO",
  CTO: "CTO",
  TPM: "TPM",
  PROJECT_LEAD: "Project Lead",
  QUALITY_LEAD: "Quality Lead",
  QR: "QR",
  INTERN: "Intern",
};
