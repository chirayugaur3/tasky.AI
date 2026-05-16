import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

type ProjectOption = { id: string; name: string };
type UserOption = { id: string; name: string; role: string; title: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultProjectId?: string;
  /** When set, modal loads the task and PATCHes on save. */
  editTaskId?: string | null;
};

const FORM_ID = "task-form";

export default function TaskModal({
  open,
  onClose,
  onSaved,
  defaultProjectId,
  editTaskId,
}: Props) {
  const isEdit = Boolean(editTaskId);
  const formRef = useRef<HTMLFormElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [assignedToId, setAssignedToId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NOT_STARTED);
  const [blockerReason, setBlockerReason] = useState("");

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [members, setMembers] = useState<UserOption[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setAssignedToId("");
      setDeadline("");
      setPriority(TaskPriority.MEDIUM);
      setStatus(TaskStatus.NOT_STARTED);
      setBlockerReason("");
      setError(null);
      setShowAdvanced(false);
    }
  }, [open]);

  // Load projects on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((res) => {
        const list = (res.data ?? []) as { id: string; name: string }[];
        setProjects(list);
        if (!projectId && !isEdit && list[0]) setProjectId(list[0].id);
      })
      .catch(() => setError("Failed to load projects"));
  }, [open, projectId, isEdit]);

  // Load team members for current project
  useEffect(() => {
    if (!open || !projectId) return;
    fetch(`/api/team?projectId=${projectId}`)
      .then((r) => r.json())
      .then((res) => {
        const list = (res.data?.members ?? []) as { userId: string; name: string; role: string; title: string | null }[];
        setMembers(list.map((m) => ({ id: m.userId, name: m.name, role: m.role, title: m.title ?? null })));
      })
      .catch(() => setError("Failed to load team"));
  }, [open, projectId]);

  // Load existing task data when editing
  useEffect(() => {
    if (!open || !editTaskId) return;
    setInitialLoading(true);
    fetch(`/api/tasks/${editTaskId}`)
      .then((r) => r.json())
      .then((res) => {
        const t = res.data;
        if (!t) throw new Error("Task not found");
        setTitle(t.title ?? "");
        setDescription(t.description ?? "");
        setProjectId(t.projectId ?? "");
        setAssignedToId(t.assignedToId ?? "");
        setDeadline(t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : "");
        setPriority(t.priority ?? TaskPriority.MEDIUM);
        setStatus(t.status ?? TaskStatus.NOT_STARTED);
        setBlockerReason(t.blockerReason ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load task"))
      .finally(() => setInitialLoading(false));
  }, [open, editTaskId]);

  // Esc to close, Cmd/Ctrl+Enter to submit
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
    if (!title.trim() || !projectId) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedToId: assignedToId || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      };
      if (!isEdit) body.projectId = projectId;
      if (isEdit) body.status = status;
      if (status === TaskStatus.BLOCKED) body.blockerReason = blockerReason || null;
      else if (isEdit) body.blockerReason = null;

      const url = isEdit ? `/api/tasks/${editTaskId}` : "/api/tasks";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
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
          <h2 className="text-section text-text-primary">{isEdit ? "Edit Task" : "New Task"}</h2>
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
          {initialLoading && (
            <p className="text-meta text-text-secondary">Loading task…</p>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Title</label>
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add context for the assignee."
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Assign to</label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary outline-none focus:border-accent-primary transition-colors"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.title ?? m.role.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isEdit}
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary outline-none focus:border-accent-primary transition-colors disabled:opacity-60"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(["LOW", "MEDIUM", "HIGH"] as TaskPriority[]).map((p) => {
                const isSel = priority === p;
                const color =
                  p === "HIGH"
                    ? "border-status-danger text-status-danger bg-[rgba(248,113,113,0.08)]"
                    : p === "MEDIUM"
                    ? "border-status-warning text-status-warning bg-[rgba(251,146,60,0.08)]"
                    : "border-text-secondary text-text-secondary bg-bg-elevated";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "py-2 rounded-button border text-body font-medium transition-colors",
                      isSel ? color : "border-border-default text-text-secondary hover:border-text-secondary"
                    )}
                  >
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {isEdit && (
            <div className="flex flex-col gap-2">
              <label className="text-meta text-text-secondary tracking-section uppercase font-medium">Status</label>
              <div className="grid grid-cols-4 gap-2">
                {(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"] as TaskStatus[]).map((s) => {
                  const isSel = status === s;
                  const tint =
                    s === "DONE"
                      ? "border-status-success text-status-success bg-[rgba(74,222,128,0.08)]"
                      : s === "BLOCKED"
                      ? "border-status-danger text-status-danger bg-[rgba(248,113,113,0.08)]"
                      : s === "IN_PROGRESS"
                      ? "border-status-warning text-status-warning bg-[rgba(251,146,60,0.08)]"
                      : "border-text-secondary text-text-secondary bg-bg-elevated";
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "py-2 rounded-button border text-meta font-medium transition-colors",
                        isSel ? tint : "border-border-default text-text-secondary hover:border-text-secondary"
                      )}
                    >
                      {s.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {status === TaskStatus.BLOCKED && (
            <div className="flex flex-col gap-2 border-l-[3px] border-l-status-danger pl-3 -ml-3">
              <label className="text-meta text-text-secondary tracking-section uppercase font-medium">
                What&apos;s blocking?
              </label>
              <textarea
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                rows={2}
                placeholder="Waiting on X / dependency on Y / need approval for Z"
                className="bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-body text-text-primary placeholder:text-text-disabled outline-none focus:border-accent-primary transition-colors resize-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-meta text-text-secondary hover:text-text-primary text-left transition-colors"
          >
            Advanced options {showAdvanced ? "▴" : "▾"}
          </button>
          {showAdvanced && (
            <p className="text-meta text-text-disabled">
              Reserved for labels, dependencies, estimate.
            </p>
          )}

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
            disabled={submitting || !title.trim() || !projectId}
            className="bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-text-primary text-body font-semibold px-6 py-2 rounded-button transition-colors"
          >
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
