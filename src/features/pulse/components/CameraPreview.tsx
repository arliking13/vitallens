"use client";

import type { CSSProperties, RefObject } from "react";
import { useEffect } from "react";

import type { FingerGateState } from "@/features/pulse/lib/fingerGate";
import type { CameraStatus } from "@/features/pulse/hooks/useRearCamera";
import {
  CameraIcon,
  CheckIcon,
  FingerTapIcon,
  HeartIcon,
  ScanPlayIcon,
} from "@/shared/components/LineIcons";

type CameraPreviewProps = {
  delayMs?: number;
  fingerGateState?: FingerGateState;
  hasPulseEstimate?: boolean;
  isPulseCheckActive?: boolean;
  isSampling?: boolean;
  liveSignal?: number[];
  scannerDetail?: string;
  scannerTitle?: string;
  showCameraPreview?: boolean;
  status: CameraStatus;
  stream: MediaStream | null;
  videoRef: RefObject<HTMLVideoElement | null>;
};

type AnimationStyle = CSSProperties & {
  "--card-delay"?: string;
};

type ScannerVisualState = "idle" | "scanning" | "ready";

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
    detail:
      "Rest your finger over the rear camera to begin reading the signal.",
    label: "Ready",
    title: "Pulse scanner",
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
    icon: FingerTapIcon,
  },
  {
    id: "hold",
    title: "Hold steady",
    icon: HeartIcon,
  },
  {
    id: "scan",
    title: "Start scan",
    icon: ScanPlayIcon,
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

function getStatusPillLabel(scannerVisualState: ScannerVisualState) {
  if (scannerVisualState === "ready") {
    return "Estimate ready";
  }

  if (scannerVisualState === "scanning") {
    return "Scanning";
  }

  return "Ready";
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
  hasPulseEstimate = false,
  isSampling = false,
  liveSignal,
  scannerDetail,
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
  const isRecordingPulseSignal =
    isSampling && fingerGateState === "recording" && !hasPulseEstimate;
  const scannerVisualState: ScannerVisualState = hasPulseEstimate
    ? "ready"
    : isRecordingPulseSignal
      ? "scanning"
      : "idle";
  const title = scannerTitle ?? copy.title;
  const detail = scannerDetail ?? copy.detail;
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
      className="vl-scanner-card animate-card-in overflow-hidden p-2.5"
      style={animationStyle}
    >
      <div className="flex items-center justify-between gap-3 px-2 pb-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="vl-glass-icon h-9 w-9" aria-hidden="true">
            <CameraIcon className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--vl-text)]">
              Pulse scanner
            </p>
          </div>
        </div>
        <span
          className={[
            "vl-state-pill",
            `vl-state-pill-${scannerVisualState}`,
          ].join(" ")}
        >
          {scannerVisualState === "ready" ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : scannerVisualState === "scanning" ? (
            <span className="vl-state-icon" aria-hidden="true">
              <HeartIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="vl-state-dot" aria-hidden="true" />
          )}
          <span>{getStatusPillLabel(scannerVisualState)}</span>
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/45 px-3 pb-3 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-1px_0_rgba(7,27,58,0.04)]">
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
            className={[
              scannerVisualState === "scanning" ? "scanner-glow" : "",
              "absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(244,124,98,0.12)] blur-2xl",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {instructionItems.map((item) => {
                const isActive = item.id === activeInstruction;
                const Icon = item.icon;

                return (
                  <div
                    className={[
                      "vl-instruction-card px-2 py-2.5 text-center",
                      isActive ? "vl-instruction-card-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={item.id}
                  >
                    <span
                      className="vl-glass-icon mx-auto h-8 w-8"
                      aria-hidden="true"
                    >
                      <Icon className="h-[1.125rem] w-[1.125rem]" />
                    </span>
                    <p className="mt-1.5 text-[0.68rem] font-bold text-[var(--vl-text)]">
                      {item.title}
                    </p>
                  </div>
                );
              })}
            </div>
            <span
              className={[
                "vl-scanner-core",
                `vl-scanner-core-${scannerVisualState}`,
              ].join(" ")}
              aria-hidden="true"
              data-state={scannerVisualState}
            >
              <span
                className={
                  scannerVisualState === "scanning"
                    ? "vl-heartbeat-target is-beating"
                    : "vl-heartbeat-target"
                }
              >
                {scannerVisualState === "ready" ? (
                  <CheckIcon className="h-7 w-7" />
                ) : scannerVisualState === "scanning" ? (
                  <HeartIcon className="h-7 w-7" />
                ) : (
                  <FingerTapIcon className="h-6 w-6" />
                )}
              </span>
            </span>
            <p className="mt-2.5 text-base font-bold text-[var(--vl-text)]">
              {title}
            </p>
            <p className="mx-auto mt-1 max-w-52 text-sm leading-5 text-[var(--vl-text-muted)]">
              {detail}
            </p>
            <div
              className="signal-preview signal-pulse vl-glass relative mt-2.5 h-14 overflow-hidden rounded-[20px]"
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
