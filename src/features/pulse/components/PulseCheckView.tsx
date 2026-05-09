"use client";

import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";

import { CameraPreview } from "./CameraPreview";
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

export function PulseCheckView({ onBack, onNext }: PulseCheckViewProps) {
  const { error, startCamera, status, stopCamera, stream, torchState } =
    useRearCamera();
  const isCameraReady = status === "ready";
  const isRequestingCamera = status === "requesting";
  const showTorchStatus = torchState !== "unsupported";

  return (
    <div className="flex flex-col">
      <ScreenHeader
        description="Rest your finger over the rear camera and stay still during the reading."
        status="Camera check"
        title="Pulse check"
        tone="pulse"
      />

      <div className="mt-6">
        <CameraPreview delayMs={40} status={status} stream={stream} />
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
          label="Pulse estimate"
          tone="warning"
          value="Waiting"
        />
      </div>

      <div className="space-y-3 pt-6">
        <Button
          className="w-full"
          disabled={isRequestingCamera}
          onClick={isCameraReady ? stopCamera : startCamera}
        >
          {isCameraReady ? "Stop camera" : "Start camera"}
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

