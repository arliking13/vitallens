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
  neutral: "bg-[#AEB8B0]",
  brand: "bg-[#157A6E]",
  pulse: "bg-[#E97E7E]",
  breath: "bg-[#69B9B0]",
  warning: "bg-[#C49A52]",
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
      className="animate-card-in rounded-[20px] border border-[#E5EAE4] bg-white px-4 py-3.5 shadow-[0_10px_26px_rgba(28,37,32,0.04)]"
      style={animationStyle}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-[#66706A]">
          <span
            className={`h-2.5 w-2.5 rounded-full ${dotClasses[tone]}`}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-[#F5F7F4] px-3 py-1 text-sm font-semibold text-[#1C2520]">
          {value}
        </span>
      </div>
      {detail ? (
        <p className="mt-2 text-sm leading-6 text-[#66706A]">{detail}</p>
      ) : null}
    </div>
  );
}
