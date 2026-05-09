type SignalPreviewProps = {
  label: string;
  bars: number[];
  tone?: "pulse" | "breath" | "report";
};

const toneClasses = {
  pulse: "bg-[#e45858]",
  breath: "bg-[#0b9a8b]",
  report: "bg-[#6f7dd9]",
};

export function SignalPreview({
  label,
  bars,
  tone = "pulse",
}: SignalPreviewProps) {
  return (
    <div className="rounded-lg border border-[#e0e7df] bg-[#fbfdfb] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66736b]">
          {label}
        </span>
        <span className="h-2 w-2 rounded-sm bg-[#f2b84b]" aria-hidden="true" />
      </div>
      <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
        {bars.map((height, index) => (
          <span
            className={`flex-1 rounded-t-sm ${toneClasses[tone]}`}
            key={`${height}-${index}`}
            style={{ height: `${height}%`, opacity: 0.42 + index * 0.018 }}
          />
        ))}
      </div>
    </div>
  );
}

