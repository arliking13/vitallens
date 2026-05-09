"use client";

import type { CSSProperties, RefObject } from "react";
import { useEffect, useState } from "react";

import type { FingerGateState } from "@/features/pulse/lib/fingerGate";
import type { CameraStatus } from "@/features/pulse/hooks/useRearCamera";

type CameraPreviewProps = {
  delayMs?: number;
  fingerGateState?: FingerGateState;
  isSampling?: boolean;
  status: CameraStatus;
  stream: MediaStream | null;
  videoRef: RefObject<HTMLVideoElement | null>;
};

type AnimationStyle = CSSProperties & {
  "--card-delay"?: string;
};

type PreviewPreference = {
  enabled: boolean;
  stream: MediaStream | null;
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

export function CameraPreview({
  delayMs = 40,
  fingerGateState,
  isSampling = false,
  status,
  stream,
  videoRef,
}: CameraPreviewProps) {
  const [previewPreference, setPreviewPreference] =
    useState<PreviewPreference>({
      enabled: false,
      stream: null,
    });
  const hasStream = stream !== null;
  const showCameraPreview =
    previewPreference.enabled && previewPreference.stream === stream;
  const shouldShowRawPreview = hasStream && showCameraPreview;
  const copy = getScannerCopy({
    fingerGateState,
    isSampling,
    status,
  });
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
      className="animate-card-in overflow-hidden rounded-[24px] border border-[#E5EAE4] bg-white p-4 shadow-[0_18px_48px_rgba(28,37,32,0.055)]"
      style={animationStyle}
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-4">
        <div>
          <p className="text-sm font-semibold text-[#1C2520]">Camera check</p>
          <p className="mt-1 text-sm leading-5 text-[#66706A]">
            Sensor view
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#F5F7F4] px-3 py-1.5 text-xs font-semibold text-[#66706A]">
          {hasStream ? copy.label : emptyStateCopy[status]}
        </span>
      </div>

      <div className="relative h-60 overflow-hidden rounded-[22px] bg-[#111815]">
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
            "scanner-surface absolute inset-0 z-10 grid place-items-center overflow-hidden px-8 text-center transition-opacity duration-200",
            shouldShowRawPreview ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          <div
            className="scanner-glow absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E97E7E]/20 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent"
            aria-hidden="true"
          />
          <div className="relative">
            <div
              className="scanner-ring mx-auto grid h-28 w-28 place-items-center rounded-full border border-[#E97E7E]/35 bg-white/[0.035] shadow-[0_0_44px_rgba(233,126,126,0.18)]"
              aria-hidden="true"
            >
              <div className="h-20 w-20 rounded-full border border-white/10 bg-[#E97E7E]/8 shadow-[inset_0_0_32px_rgba(233,126,126,0.16)]" />
            </div>
            <p className="mt-6 text-base font-semibold text-white">
              {copy.title}
            </p>
            <p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-white/64">
              {copy.detail}
            </p>
          </div>
        </div>

        {shouldShowRawPreview ? (
          <div className="absolute left-3 top-3 z-30 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            Debug preview
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex justify-end px-1">
        <button
          aria-pressed={showCameraPreview}
          className="interactive-press rounded-full border border-[#E5EAE4] bg-[#F5F7F4] px-3 py-1.5 text-xs font-semibold text-[#66706A]"
          disabled={!hasStream}
          onClick={() => {
            setPreviewPreference({
              enabled: !shouldShowRawPreview,
              stream,
            });
          }}
          type="button"
        >
          {shouldShowRawPreview ? "Hide camera preview" : "Show camera preview"}
        </button>
      </div>
    </div>
  );
}
