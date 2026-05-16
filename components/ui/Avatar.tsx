import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

type Size = "sm" | "md";

/**
 * Initials in a square chip. Never an img tag — per design system.
 */
export default function Avatar({
  name,
  size = "sm",
  className,
}: {
  name: string | null | undefined;
  size?: Size;
  className?: string;
}) {
  const sizeClass =
    size === "md" ? "w-8 h-8 text-meta" : "w-6 h-6 text-[10px]";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-chip bg-bg-elevated text-text-secondary font-medium shrink-0",
        sizeClass,
        className
      )}
      title={name ?? undefined}
    >
      {initials(name)}
    </span>
  );
}
