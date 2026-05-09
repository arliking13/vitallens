type StatusTone = "neutral" | "ready" | "complete" | "pending";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-[#d8ded6] bg-white text-[#536159]",
  ready: "border-[#9fd8ce] bg-[#e8f8f4] text-[#0b6f61]",
  complete: "border-[#b7d99f] bg-[#eff9e8] text-[#3b6f1f]",
  pending: "border-[#ffd09c] bg-[#fff4e6] text-[#8a4d00]",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

