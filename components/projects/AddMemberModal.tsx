import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import Avatar from "@/components/ui/Avatar";

type AvailableUser = { id: string; name: string; role: string; title: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  projectId: string;
};

export default function AddMemberModal({ open, onClose, onSaved, projectId }: Props) {
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setQuery("");
      setError(null);
      return;
    }
    setLoading(true);
    fetch(`/api/users?notInProject=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setUsers(res.data ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add members");
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add members");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const visible = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.title ?? "").toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
    : users;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] bg-bg-surface border-l border-border-subtle h-full flex flex-col animate-slide-in-right shadow-modal">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div className="flex flex-col">
            <h2 className="text-section text-text-primary">Add Members</h2>
            <p className="text-meta text-text-secondary">
              {selected.size === 0 ? "Select people to add" : `${selected.size} selected`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-meta text-text-secondary hover:text-text-primary transition-colors"
          >
            Esc to close <X size={16} />
          </button>
        </div>

        <div className="p-6 pb-3 border-b border-border-subtle">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, title, or role"
            autoFocus
            className="w-full bg-bg-elevated border border-border-default rounded-card px-4 py-2.5 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-6 text-meta text-text-secondary">Loading…</p>}
          {error && <p className="p-6 text-meta text-status-danger">{error}</p>}
          {!loading && !error && visible.length === 0 && (
            <p className="p-6 text-meta text-text-disabled">
              {users.length === 0
                ? "Everyone is already on this project."
                : "No matches for that search."}
            </p>
          )}
          {visible.map((u) => {
            const isSel = selected.has(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggle(u.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3 border-b border-[rgba(255,255,255,0.04)] text-left transition-colors",
                  isSel ? "bg-accent-subtle" : "hover:bg-bg-elevated/60"
                )}
              >
                <Avatar name={u.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-body text-text-primary truncate">{u.name}</p>
                  <p className="text-meta text-text-secondary truncate">
                    {u.title ?? u.role.replace("_", " ")}
                  </p>
                </div>
                <span
                  className={cn(
                    "w-5 h-5 rounded-chip border flex items-center justify-center transition-colors",
                    isSel
                      ? "bg-accent-primary border-accent-primary"
                      : "border-border-default"
                  )}
                >
                  {isSel && <Check size={12} className="text-text-primary" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-6 border-t border-border-subtle flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="text-body text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || selected.size === 0}
            className="bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-text-primary text-body font-semibold px-6 py-2 rounded-button transition-colors"
          >
            {submitting
              ? "Adding…"
              : selected.size > 0
              ? `Add ${selected.size} ${selected.size === 1 ? "member" : "members"}`
              : "Add members"}
          </button>
        </div>
      </div>
    </div>
  );
}
