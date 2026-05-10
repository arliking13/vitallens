import type { CSSProperties } from "react";

type InfoRowProps = {
  delayMs?: number;
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "brand" | "pulse" | "breath" | "warning";
};

type AnimationStyle = CSSProperties & {
  "--card-delay"?: string;
};

const dotClasses = {
  neutral: "bg-[var(--vl-text-soft)]",
  brand: "bg-[var(--vl-peach)]",
  pulse: "bg-[var(--vl-peach)]",
  breath: "bg-[var(--vl-peach)]",
  warning: "bg-[var(--vl-warning)]",
};

export function InfoRow({
  delayMs = 80,
  label,
  value,
  detail,
  tone = "neutral",
}: InfoRowProps) {
  const animationStyle: AnimationStyle = {
    "--card-delay": `${delayMs}ms`,
  };

  return (
    <div
      className="vl-debug-row animate-card-in px-4 py-3.5"
      style={animationStyle}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--vl-text-muted)]">
          <span
            className={`h-2.5 w-2.5 rounded-full ${dotClasses[tone]}`}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="vl-glass-pill shrink-0 px-3 py-1 text-sm font-semibold text-[var(--vl-text)]">
          {value}
        </span>
      </div>
      {detail ? (
        <p className="mt-2 text-sm leading-6 text-[var(--vl-text-muted)]">{detail}</p>
      ) : null}
    </div>
  );
}
