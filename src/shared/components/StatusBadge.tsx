type StatusTone =
  | "neutral"
  | "brand"
  | "pulse"
  | "breath"
  | "warning"
  | "complete"
  | "ready"
  | "pending";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-[var(--vl-glass-border)] bg-white/50 text-[var(--vl-text-muted)]",
  brand: "border-[var(--vl-peach-border)] bg-[var(--vl-peach-soft)] text-[var(--vl-peach-strong)]",
  pulse: "border-[var(--vl-peach-border)] bg-[var(--vl-peach-soft)] text-[var(--vl-peach-strong)]",
  breath: "border-[var(--vl-peach-border)] bg-white/50 text-[var(--vl-peach-strong)]",
  warning: "border-[#F0D29A] bg-[var(--vl-warning-soft)] text-[#8A641A]",
  complete: "border-[#BDE5CB] bg-[var(--vl-success-soft)] text-[var(--vl-success)]",
  ready: "border-[var(--vl-peach-border)] bg-[var(--vl-peach-soft)] text-[var(--vl-peach-strong)]",
  pending: "border-[#F0D29A] bg-[var(--vl-warning-soft)] text-[#8A641A]",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "vl-glass-pill inline-flex items-center px-3 py-1.5 text-xs font-semibold leading-none",
        toneClasses[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
