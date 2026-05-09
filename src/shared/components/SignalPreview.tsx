import type { CSSProperties } from "react";

type SignalPreviewProps = {
  caption: string;
  delayMs?: number;
  label: string;
  status: string;
  tone: "pulse" | "breath";
};

type AnimationStyle = CSSProperties & {
  "--card-delay"?: string;
};

const previewStyles = {
  pulse: {
    accent: "#E97E7E",
    background: "bg-[#fff5f5]",
    glow: "bg-[#E97E7E]/10",
    path: "M4 76 C20 72 28 60 40 60 C54 60 60 82 74 82 C88 82 94 58 108 58 C124 58 130 82 144 82 C158 82 166 58 180 58 C194 58 202 80 216 80 C226 80 232 74 236 72",
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
  delayMs = 40,
  label,
  status,
  tone,
}: SignalPreviewProps) {
  const style = previewStyles[tone];
  const animationStyle: AnimationStyle = {
    "--card-delay": `${delayMs}ms`,
  };

  return (
    <div
      className={[
        "signal-preview animate-card-in overflow-hidden rounded-[24px] border border-[#E5EAE4] bg-white p-4 shadow-[0_18px_48px_rgba(28,37,32,0.055)]",
        tone === "pulse" ? "signal-pulse" : "signal-breathe",
      ].join(" ")}
      style={animationStyle}
    >
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
          className={`signal-glow absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl ${style.glow}`}
        />
        {tone === "pulse" ? (
          <div className="signal-orb absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full border border-white/80 bg-white/70 shadow-[inset_0_0_0_10px_rgba(233,126,126,0.08),0_16px_40px_rgba(233,126,126,0.16)]" />
        ) : (
          <div className="signal-orb absolute left-1/2 top-7 h-28 w-16 -translate-x-1/2 rounded-[24px] border border-white/80 bg-white/70 shadow-[inset_0_0_0_7px_rgba(105,185,176,0.08),0_16px_40px_rgba(105,185,176,0.16)]" />
        )}
        <svg
          className="signal-wave absolute inset-x-4 bottom-9 h-28"
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
