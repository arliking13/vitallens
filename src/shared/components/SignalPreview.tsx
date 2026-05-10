import type { CSSProperties } from "react";

type SignalPreviewProps = {
  caption: string;
  delayMs?: number;
  label: string;
  liveSignal?: number[];
  status: string;
  tone: "pulse" | "breath";
};

type AnimationStyle = CSSProperties & {
  "--card-delay"?: string;
};

const previewStyles = {
  pulse: {
    accent: "var(--vl-peach)",
    background: "bg-[rgba(253,233,227,0.45)]",
    glow: "bg-[rgba(244,124,98,0.12)]",
    path: "M4 76 C20 72 28 60 40 60 C54 60 60 82 74 82 C88 82 94 58 108 58 C124 58 130 82 144 82 C158 82 166 58 180 58 C194 58 202 80 216 80 C226 80 232 74 236 72",
  },
  breath: {
    accent: "var(--vl-peach)",
    background: "bg-white/35",
    glow: "bg-[rgba(244,124,98,0.12)]",
    path: "M4 74 C26 32 54 32 76 74 C98 116 126 116 148 74 C170 32 198 32 236 74",
  },
};

function clampSignalValue(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildFlatPath() {
  return "M4 72 C48 72 68 72 92 72 C116 72 140 72 164 72 C188 72 212 72 236 72";
}

function buildSignalPath(values: number[]) {
  if (values.length < 2) {
    return buildFlatPath();
  }

  const width = 232;
  const startX = 4;
  const baseY = 92;
  const amplitude = 56;
  const stepX = width / (values.length - 1);
  const points = values.map((value, index) => ({
    x: startX + stepX * index,
    y: baseY - clampSignalValue(value) * amplitude,
  }));

  return points.slice(1).reduce((path, point, index) => {
    const previousPoint = points[index];
    const controlX = (previousPoint.x + point.x) / 2;
    return `${path} C ${controlX} ${previousPoint.y} ${controlX} ${point.y} ${point.x} ${point.y}`;
  }, `M${points[0].x} ${points[0].y}`);
}

export function SignalPreview({
  caption,
  delayMs = 40,
  label,
  liveSignal,
  status,
  tone,
}: SignalPreviewProps) {
  const style = previewStyles[tone];
  const path =
    liveSignal === undefined ? style.path : buildSignalPath(liveSignal);
  const animationStyle: AnimationStyle = {
    "--card-delay": `${delayMs}ms`,
  };

  return (
    <div
      className={[
        "signal-preview vl-glass-card animate-card-in overflow-hidden p-4",
        tone === "pulse" ? "signal-pulse" : "signal-breathe",
      ].join(" ")}
      style={animationStyle}
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-4">
        <div>
          <p className="text-sm font-semibold text-[var(--vl-text)]">{label}</p>
          <p className="mt-1 text-sm leading-5 text-[var(--vl-text-muted)]">{caption}</p>
        </div>
        <span className="vl-glass-pill shrink-0 px-3 py-1.5 text-xs font-semibold text-[var(--vl-text-muted)]">
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
            d={path}
            fill="none"
            opacity="0.18"
            stroke={style.accent}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="18"
          />
          <path
            d={path}
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
