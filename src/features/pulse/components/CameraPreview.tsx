"use client";

import type { CSSProperties, RefObject } from "react";
import { useEffect } from "react";

import type { CameraStatus } from "@/features/pulse/hooks/useRearCamera";

type CameraPreviewProps = {
  delayMs?: number;
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

export function CameraPreview({
  delayMs = 40,
  status,
  stream,
  videoRef,
}: CameraPreviewProps) {
  const hasStream = stream !== null;
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
          <p className="text-sm font-semibold text-[#1C2520]">Camera preview</p>
          <p className="mt-1 text-sm leading-5 text-[#66706A]">
            Rear camera stream
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#F5F7F4] px-3 py-1.5 text-xs font-semibold text-[#66706A]">
          {hasStream ? "Live" : emptyStateCopy[status]}
        </span>
      </div>

      <div className="relative h-56 overflow-hidden rounded-[22px] bg-[#fff5f5]">
        {hasStream ? (
          <video
            aria-label="Live rear camera preview"
            autoPlay
            className="h-full w-full object-cover"
            muted
            playsInline
            ref={videoRef}
          />
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <div
                className="mx-auto h-24 w-24 rounded-full border border-white/80 bg-white/70 shadow-[inset_0_0_0_10px_rgba(233,126,126,0.08),0_16px_40px_rgba(233,126,126,0.16)]"
                aria-hidden="true"
              />
              <p className="mt-5 text-sm font-semibold text-[#1C2520]">
                {emptyStateCopy[status]}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#66706A]">
                Start the camera when you are ready to position your finger.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
