import { format, formatDistanceToNowStrict, differenceInDays } from "date-fns";

/** Two-letter initials, e.g. "Aryan Sharma" → "AS" */
export function initials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}

/** "Aryan Sharma" → "A. Sharma" — used in tight rows like blockers */
export function initialLastName(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "?";
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

/** Header date — "Fri, 16 May" */
export function formatHeaderDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "EEE, d MMM");
}

/** Long-form date — "Friday, 16 May 2025" (used on EOD page) */
export function formatLongDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "EEEE, d MMMM yyyy");
}

/** Short date — "Oct 03" */
export function formatShortDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "MMM dd");
}

/** Time-of-day — "14:00" */
export function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "HH:mm");
}

/** "Blocked 2d", "Blocked 4h" — compact duration since a moment */
export function formatBlockedDuration(since: Date | string | null): string {
  if (!since) return "";
  const date = typeof since === "string" ? new Date(since) : since;
  // formatDistanceToNowStrict gives "4 hours", "2 days" — compress to "4h", "2d"
  const raw = formatDistanceToNowStrict(date, { roundingMethod: "floor" });
  return raw
    .replace(/ seconds?$/, "s")
    .replace(/ minutes?$/, "m")
    .replace(/ hours?$/, "h")
    .replace(/ days?$/, "d")
    .replace(/ months?$/, "mo")
    .replace(/ years?$/, "y");
}

/** "Overdue" / "2d left" / "14d left" */
export function formatDaysLeft(deadline: Date | string): string {
  const date = typeof deadline === "string" ? new Date(deadline) : deadline;
  const days = differenceInDays(date, new Date());
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  return `${days}d left`;
}

/** Priority label compression — HIGH → "P1", MEDIUM → "P2", LOW → "P3" */
export function priorityLabel(p: "HIGH" | "MEDIUM" | "LOW"): string {
  return p === "HIGH" ? "P1" : p === "MEDIUM" ? "P2" : "P3";
}
