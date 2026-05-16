import { AlertCircle } from "lucide-react";
import { formatBlockedDuration, initialLastName } from "@/lib/format";

export type BlockerAlertData = {
  id: string;
  title: string;
  assigneeName: string | null;
  blockedSince: Date | string | null;
  projectName?: string;
};

/**
 * Blocker row — 3px red left bar + alert icon + title + assignee + duration.
 * Single click opens the task in edit mode (philosophy: no ceremony).
 */
export default function BlockerAlert({
  blocker,
  onClick,
}: {
  blocker: BlockerAlertData;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 border-l-[3px] border-l-status-danger pl-3 pr-2 h-9 hover:bg-bg-elevated/60 transition-colors rounded-r-button text-left"
    >
      <AlertCircle size={14} className="text-status-danger shrink-0" />
      <p className="text-body text-text-primary flex-1 min-w-0 truncate">{blocker.title}</p>
      <span className="text-meta text-text-secondary hidden sm:inline truncate max-w-[120px]">
        {initialLastName(blocker.assigneeName)}
      </span>
      <span className="text-meta text-status-danger shrink-0 tabular-nums">
        Blocked {formatBlockedDuration(blocker.blockedSince)}
      </span>
    </button>
  );
}
