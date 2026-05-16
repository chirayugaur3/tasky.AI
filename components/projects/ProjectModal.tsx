import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ProjectHealth } from "@prisma/client";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
};

const FORM_ID = "project-form";

export default function ProjectModal({ open, onClose, onSaved }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [health, setHealth] = useState<ProjectHealth>(ProjectHealth.ON_TRACK);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setDeadline("");
      setHealth(ProjectHealth.ON_TRACK);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !deadline) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          deadline: new Date(deadline).toISOString(),
          health,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create project");
      onSaved?.(json.data?.id ?? "");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] bg-bg-surface border-l border-border-subtle h-full flex flex-col animate-slide-in-right shadow-modal">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <h2 className="text-section text-text-primary">New Project</h2>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-meta text-text-secondary hover:text-text-primary transition-colors"
          >
            Esc to close <X size={16} />
          </button>
        </div>

        <form
          id={FORM_ID}
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Name</label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DPO Eval Harness v0.5"
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="One sentence on what this project ships."
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Deadline</label>
            <input
              required
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Initial Health</label>
            <div className="grid grid-cols-3 gap-2">
              {(["ON_TRACK", "AT_RISK", "BLOCKED"] as ProjectHealth[]).map((h) => {
                const isSel = health === h;
                const tint =
                  h === "ON_TRACK"
                    ? "border-status-success text-status-success bg-[rgba(74,222,128,0.08)]"
                    : h === "AT_RISK"
                    ? "border-status-warning text-status-warning bg-[rgba(251,146,60,0.08)]"
                    : "border-status-danger text-status-danger bg-[rgba(248,113,113,0.08)]";
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHealth(h)}
                    className={cn(
                      "py-2 rounded-button border text-meta font-medium transition-colors",
                      isSel ? tint : "border-border-default text-text-secondary hover:border-text-secondary"
                    )}
                  >
                    {h.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-meta text-status-danger">{error}</p>}
        </form>

        <div className="p-6 border-t border-border-subtle flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="text-body text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={submitting || !name.trim() || !deadline}
            className="bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-text-primary text-body font-semibold px-6 py-2 rounded-button transition-colors"
          >
            {submitting ? "Creating…" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
