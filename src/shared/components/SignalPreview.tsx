type SignalPreviewProps = {
  caption: string;
  label: string;
  status: string;
  tone: "pulse" | "breath";
};

const previewStyles = {
  pulse: {
    accent: "#E97E7E",
    background: "bg-[#fff5f5]",
    glow: "bg-[#E97E7E]/10",
    path: "M4 64 C20 64 26 64 34 64 C42 64 44 28 52 28 C61 28 62 100 72 100 C80 100 82 64 90 64 C108 64 112 64 126 64 C142 64 146 42 154 42 C163 42 164 86 174 86 C184 86 187 64 196 64 C214 64 220 64 236 64",
  },
  breath: {
    accent: "#69B9B0",
    background: "bg-[#f0fbf9]",
    glow: "bg-[#69B9B0]/14",
    path: "M4 74 C26 32 54 32 76 74 C98 116 126 116 148 74 C170 32 198 32 236 74",
  },
};

export function SignalPreview({
  caption,
  label,
  status,
  tone,
}: SignalPreviewProps) {
  const style = previewStyles[tone];

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E5EAE4] bg-white p-4 shadow-[0_18px_48px_rgba(28,37,32,0.055)]">
      <div className="flex items-center justify-between gap-3 px-1 pb-4">
        <div>
          <p className="text-sm font-semibold text-[#1C2520]">{label}</p>
          <p className="mt-1 text-sm leading-5 text-[#66706A]">{caption}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#F5F7F4] px-3 py-1.5 text-xs font-semibold text-[#66706A]">
          {status}
        </span>
      </div>
      <div
        className={`relative h-56 overflow-hidden rounded-[22px] ${style.background}`}
        aria-hidden="true"
      >
        <div
          className={`absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl ${style.glow}`}
        />
        {tone === "pulse" ? (
          <div className="absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full border border-white/80 bg-white/70 shadow-[inset_0_0_0_10px_rgba(233,126,126,0.08),0_16px_40px_rgba(233,126,126,0.16)]" />
        ) : (
          <div className="absolute left-1/2 top-7 h-28 w-16 -translate-x-1/2 rounded-[24px] border border-white/80 bg-white/70 shadow-[inset_0_0_0_7px_rgba(105,185,176,0.08),0_16px_40px_rgba(105,185,176,0.16)]" />
        )}
        <svg
          className="absolute inset-x-4 bottom-9 h-28"
          preserveAspectRatio="none"
          viewBox="0 0 240 128"
        >
          <path
            d={style.path}
            fill="none"
            opacity="0.18"
            stroke={style.accent}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="18"
          />
          <path
            d={style.path}
            fill="none"
            stroke={style.accent}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
        </svg>
      </div>
    </div>
  );
}
