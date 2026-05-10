"use client";

import type { CSSProperties, RefObject } from "react";
import { useEffect } from "react";

import type { FingerGateState } from "@/features/pulse/lib/fingerGate";
import type { CameraStatus } from "@/features/pulse/hooks/useRearCamera";

type CameraPreviewProps = {
  delayMs?: number;
  fingerGateState?: FingerGateState;
  isSampling?: boolean;
  liveSignal?: number[];
  scannerDetail?: string;
  scannerLabel?: string;
  scannerTitle?: string;
  showCameraPreview?: boolean;
  status: CameraStatus;
  stream: MediaStream | null;
  videoRef: RefObject<HTMLVideoElement | null>;
};

type AnimationStyle = CSSProperties & {
  "--card-delay"?: string;
};

const emptyStateCopy: Record<CameraStatus, string> = {
  idle: "Camera is idle",
  requesting: "Requesting camera",
  ready: "Camera ready",
  denied: "Permission denied",
  error: "Camera error",
};

const scannerCopy: Record<
  CameraStatus,
  {
    detail: string;
    label: string;
    title: string;
  }
> = {
  idle: {
    detail: "Start the camera when you are ready to position your finger.",
    label: "Camera off",
    title: "Sensor ready",
  },
  requesting: {
    detail: "Keep this screen open while VitalLens prepares the rear camera.",
    label: "Preparing",
    title: "Opening sensor",
  },
  ready: {
    detail: "Rest your finger over the rear camera to begin reading the signal.",
    label: "Ready",
    title: "Camera check",
  },
  denied: {
    detail: "Allow camera access in Safari or browser settings to continue.",
    label: "Permission",
    title: "Camera permission needed",
  },
  error: {
    detail: "Try stopping and starting the camera again.",
    label: "Needs attention",
    title: "Camera unavailable",
  },
};

const gateScannerCopy: Record<
  FingerGateState,
  {
    detail: string;
    label: string;
    title: string;
  }
> = {
  "waiting-for-finger": {
    detail: "Cover the rear camera fully with steady, gentle pressure.",
    label: "Waiting",
    title: "Place finger over camera",
  },
  stabilizing: {
    detail: "Keep your finger still while the signal settles.",
    label: "Stabilizing",
    title: "Hold steady",
  },
  recording: {
    detail: "Keep your finger still while VitalLens records a clean signal.",
    label: "Recording",
    title: "Recording clean signal",
  },
  "finger-lost": {
    detail: "Place your finger back over the camera and hold steady again.",
    label: "Finger moved",
    title: "Hold steady again",
  },
};

const instructionItems = [
  {
    id: "place",
    title: "Place finger",
    detail: "Cover the rear camera gently.",
  },
  {
    id: "hold",
    title: "Hold steady",
    detail: "Keep your finger still and relaxed.",
  },
  {
    id: "scan",
    title: "Start scan",
    detail: "Tap start. The flash will turn on.",
  },
] as const;

type InstructionId = (typeof instructionItems)[number]["id"];

function getScannerCopy({
  fingerGateState,
  isSampling,
  status,
}: {
  fingerGateState?: FingerGateState;
  isSampling: boolean;
  status: CameraStatus;
}) {
  if (status === "ready" && isSampling && fingerGateState) {
    return gateScannerCopy[fingerGateState];
  }

  return scannerCopy[status];
}

function getActiveInstruction({
  fingerGateState,
  isSampling,
  status,
}: {
  fingerGateState?: FingerGateState;
  isSampling: boolean;
  status: CameraStatus;
}): InstructionId {
  if (!isSampling) {
    return status === "ready" ? "place" : "scan";
  }

  if (
    fingerGateState === "waiting-for-finger" ||
    fingerGateState === "finger-lost"
  ) {
    return "place";
  }

  if (fingerGateState === "stabilizing") {
    return "hold";
  }

  return "scan";
}

function clampSignalValue(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildFlatPath() {
  return "M4 38 C42 38 66 38 92 38 C118 38 142 38 168 38 C194 38 216 38 236 38";
}

function buildSignalPath(values: number[]) {
  if (values.length < 2) {
    return buildFlatPath();
  }

  const width = 232;
  const startX = 4;
  const baseY = 50;
  const amplitude = 36;
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

export function CameraPreview({
  delayMs = 40,
  fingerGateState,
  isSampling = false,
  liveSignal,
  scannerDetail,
  scannerLabel,
  scannerTitle,
  showCameraPreview = false,
  status,
  stream,
  videoRef,
}: CameraPreviewProps) {
  const hasStream = stream !== null;
  const shouldShowRawPreview = hasStream && showCameraPreview;
  const copy = getScannerCopy({
    fingerGateState,
    isSampling,
    status,
  });
  const activeInstruction = getActiveInstruction({
    fingerGateState,
    isSampling,
    status,
  });
  const title = scannerTitle ?? copy.title;
  const detail = scannerDetail ?? copy.detail;
  const label = scannerLabel ?? (hasStream ? copy.label : emptyStateCopy[status]);
  const signalPath = buildSignalPath(liveSignal ?? []);
  const animationStyle: AnimationStyle = {
    "--card-delay": `${delayMs}ms`,
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.srcObject = stream;

    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  return (
    <div
      className="vl-scanner-card animate-card-in overflow-hidden p-3"
      style={animationStyle}
    >
      <div className="flex items-center justify-between gap-3 px-2 pb-3">
        <div>
          <p className="text-sm font-semibold text-[var(--vl-text)]">Camera check</p>
          <p className="mt-1 text-sm leading-5 text-[var(--vl-text-muted)]">
            Sensor view
          </p>
        </div>
        <span className="vl-glass-pill shrink-0 px-3 py-1.5 text-xs font-semibold text-[var(--vl-text-muted)]">
          {label}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-white/60 bg-white/40 px-4 pb-4 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
        <video
          aria-hidden={!shouldShowRawPreview}
          aria-label={
            shouldShowRawPreview
              ? "Live rear camera preview"
              : "Rear camera stream for pulse sampling"
          }
          autoPlay
          className={[
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
            shouldShowRawPreview
              ? "z-20 opacity-100"
              : "z-0 opacity-0 pointer-events-none",
          ].join(" ")}
          muted
          playsInline
          ref={videoRef}
        />

        <div
          className={[
            "scanner-surface relative z-10 text-center transition-opacity duration-200",
            shouldShowRawPreview ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          <div
            className="scanner-glow absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(244,124,98,0.18)] blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="mb-4 grid grid-cols-3 gap-2">
              {instructionItems.map((item) => {
                const isActive = item.id === activeInstruction;

                return (
                  <div
                    className={[
                      "vl-instruction-card px-2.5 py-3 text-left",
                      isActive ? "vl-instruction-card-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={item.id}
                  >
                    <span className="vl-peach-pill inline-flex h-8 w-8 items-center justify-center text-xs font-bold">
                      {instructionItems.indexOf(item) + 1}
                    </span>
                    <p className="mt-2 text-xs font-bold text-[var(--vl-text)]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[0.68rem] leading-4 text-[var(--vl-text-muted)]">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
            <div
              className="scanner-ring mx-auto grid h-24 w-24 place-items-center rounded-full border border-[var(--vl-peach-border)] bg-[rgba(253,233,227,0.52)] shadow-[0_0_44px_rgba(244,124,98,0.18),inset_0_1px_0_rgba(255,255,255,0.78)]"
              aria-hidden="true"
            >
              <div className="h-[4.5rem] w-[4.5rem] rounded-full border border-white/60 bg-[rgba(244,124,98,0.28)] shadow-[inset_0_0_32px_rgba(244,124,98,0.2)]" />
            </div>
            <p className="mt-4 text-base font-bold text-[var(--vl-text)]">
              {title}
            </p>
            <p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-[var(--vl-text-muted)]">
              {detail}
            </p>
            <div
              className="signal-preview signal-pulse vl-glass relative mt-4 h-16 overflow-hidden rounded-[18px]"
              aria-hidden="true"
            >
              <div className="signal-glow absolute left-1/2 top-2 h-12 w-24 -translate-x-1/2 rounded-full bg-[rgba(244,124,98,0.12)] blur-2xl" />
              <svg
                className="signal-wave absolute inset-x-3 bottom-1 h-14"
                preserveAspectRatio="none"
                viewBox="0 0 240 64"
              >
                <path
                  d={signalPath}
                  fill="none"
                  opacity="0.18"
                  stroke="var(--vl-peach)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="12"
                />
                <path
                  d={signalPath}
                  fill="none"
                  stroke="var(--vl-peach)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
              </svg>
            </div>
          </div>
        </div>

        {shouldShowRawPreview ? (
          <div className="absolute left-3 top-3 z-30 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            Debug preview
          </div>
        ) : null}
      </div>
    </div>
  );
}
