"use client";

import { useRef } from "react";

import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { SignalPreview } from "@/shared/components/SignalPreview";
import { StatusBadge } from "@/shared/components/StatusBadge";

import { CameraPreview } from "./CameraPreview";
import { usePulseFrameSampler } from "../hooks/usePulseFrameSampler";
import { useRearCamera } from "../hooks/useRearCamera";

type PulseCheckViewProps = {
  onBack: () => void;
  onNext: () => void;
};

const cameraStatusLabels = {
  idle: "Idle",
  requesting: "Requesting camera",
  ready: "Camera ready",
  denied: "Permission denied",
  error: "Camera error",
};

const torchStatusLabels = {
  off: "Torch off",
  on: "Torch on",
  failed: "Torch unavailable",
  unsupported: "Torch unsupported",
};

const samplingStatusLabels = {
  idle: "Idle",
  sampling: "Sampling",
  stopped: "Stopped",
  error: "Error",
};

export function PulseCheckView({ onBack, onNext }: PulseCheckViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { error, startCamera, status, stopCamera, stream, torchState } =
    useRearCamera();
  const {
    error: samplingError,
    liveSignal,
    resetSamples,
    samples,
    startSampling,
    status: samplingStatus,
    stopSampling,
  } = usePulseFrameSampler({ stream, videoRef });
  const isCameraReady = status === "ready";
  const isRequestingCamera = status === "requesting";
  const isSampling = samplingStatus === "sampling";
  const showTorchStatus = torchState !== "unsupported";

  function handleCameraButtonClick() {
    if (isCameraReady) {
      stopSampling();
      stopCamera();
      return;
    }

    resetSamples();
    startCamera();
  }

  return (
    <div className="flex flex-col">
      <ScreenHeader
        description="Rest your finger over the rear camera and stay still during the reading."
        status="Camera check"
        title="Pulse check"
        tone="pulse"
      />

      <div className="mt-6">
        <CameraPreview
          delayMs={40}
          status={status}
          stream={stream}
          videoRef={videoRef}
        />
      </div>

      <div className="mt-4">
        <SignalPreview
          caption="Raw green-channel signal"
          delayMs={80}
          label="Live signal"
          liveSignal={liveSignal}
          status={samplingStatusLabels[samplingStatus]}
          tone="pulse"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge tone={isCameraReady ? "complete" : "neutral"}>
          {cameraStatusLabels[status]}
        </StatusBadge>
        {showTorchStatus ? (
          <StatusBadge tone={torchState === "on" ? "pulse" : "warning"}>
            {torchStatusLabels[torchState]}
          </StatusBadge>
        ) : null}
        <StatusBadge tone={isSampling ? "pulse" : "neutral"}>
          {samplingStatusLabels[samplingStatus]}
        </StatusBadge>
      </div>

      <div className="mt-4 grid gap-3">
        <InfoRow
          delayMs={80}
          detail={error ?? undefined}
          label="Camera status"
          tone={status === "denied" || status === "error" ? "warning" : "pulse"}
          value={cameraStatusLabels[status]}
        />
        <InfoRow
          delayMs={120}
          detail={samplingError ?? undefined}
          label="Frame sampler"
          tone={samplingStatus === "error" ? "warning" : "pulse"}
          value={samplingStatusLabels[samplingStatus]}
        />
        <InfoRow
          delayMs={160}
          label="Raw samples"
          tone="neutral"
          value={String(samples.length)}
        />
      </div>

      <div className="space-y-3 pt-6">
        <Button
          className="w-full"
          disabled={isRequestingCamera}
          onClick={handleCameraButtonClick}
        >
          {isCameraReady ? "Stop camera" : "Start camera"}
        </Button>
        <Button
          className="w-full"
          disabled={!isCameraReady}
          onClick={isSampling ? stopSampling : startSampling}
          variant="secondary"
        >
          {isSampling ? "Stop signal" : "Start signal"}
        </Button>
        <Button className="w-full" onClick={onNext} variant="secondary">
          Continue
        </Button>
        <Button className="w-full" onClick={onBack} variant="ghost">
          Back
        </Button>
      </div>
    </div>
  );
}
