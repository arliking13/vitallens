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
  neutral: "border-[#E5EAE4] bg-white text-[#66706A]",
  brand: "border-[#c8e7e2] bg-[#edf8f6] text-[#157A6E]",
  pulse: "border-[#f5c9c9] bg-[#fff2f2] text-[#b95555]",
  breath: "border-[#c7e9e5] bg-[#effaf8] text-[#2d8078]",
  warning: "border-[#ead8bd] bg-[#F4E7D2] text-[#7c5a24]",
  complete: "border-[#cfe6bf] bg-[#f1faed] text-[#4f7f33]",
  ready: "border-[#c8e7e2] bg-[#edf8f6] text-[#157A6E]",
  pending: "border-[#ead8bd] bg-[#F4E7D2] text-[#7c5a24]",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold leading-none",
        toneClasses[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
