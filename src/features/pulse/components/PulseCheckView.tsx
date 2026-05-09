"use client";

import { useRef, useState } from "react";

import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { SignalPreview } from "@/shared/components/SignalPreview";
import { StatusBadge } from "@/shared/components/StatusBadge";

import { CameraPreview } from "./CameraPreview";
import {
  buildPpgDebugReport,
  downloadPpgDebugReport,
} from "../lib/ppgDebugReport";
import { usePulseFrameSampler } from "../hooks/usePulseFrameSampler";
import type { CameraStatus, TorchState } from "../hooks/useRearCamera";
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

const MIN_EXPORT_DURATION_MS = 5000;

const fingerGateLabels = {
  "waiting-for-finger": "Place finger over camera",
  stabilizing: "Hold steady",
  recording: "Recording clean signal",
  "finger-lost": "Finger moved - hold steady again",
};

const fingerGateTones = {
  "waiting-for-finger": "warning",
  stabilizing: "pulse",
  recording: "complete",
  "finger-lost": "warning",
} as const;

const fingerGateRowTones = {
  "waiting-for-finger": "warning",
  stabilizing: "pulse",
  recording: "brand",
  "finger-lost": "warning",
} as const;

const signalQualityLabels = {
  "no-signal": "No signal",
  "too-dark": "Too dark",
  "too-bright": "Too bright",
  unstable: "Unstable",
  fair: "Fair",
  good: "Good",
};

const signalQualityTones = {
  "no-signal": "neutral",
  "too-dark": "warning",
  "too-bright": "warning",
  unstable: "warning",
  fair: "pulse",
  good: "complete",
} as const;

const signalQualityRowTones = {
  "no-signal": "neutral",
  "too-dark": "warning",
  "too-bright": "warning",
  unstable: "warning",
  fair: "pulse",
  good: "brand",
} as const;

const pulseConfidenceLabels = {
  low: "Low",
  fair: "Fair",
  good: "Good",
};

const pulseConfidenceRowTones = {
  low: "warning",
  fair: "pulse",
  good: "brand",
} as const;

export function PulseCheckView({ onBack, onNext }: PulseCheckViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStatusAtStart, setCameraStatusAtStart] =
    useState<CameraStatus | null>(null);
  const [torchStateAtStart, setTorchStateAtStart] = useState<TorchState | null>(
    null,
  );
  const { error, startCamera, status, stopCamera, stream, torchState } =
    useRearCamera();
  const {
    cleanWindowDurationMs,
    cleanWindowFingerDetected,
    currentWindowValidSampleCount,
    currentFingerDetected,
    fingerGateState,
    error: samplingError,
    lastFingerLostAt,
    pulseEstimate,
    qualityMessage,
    recordingStartedAt,
    resetSamples,
    samples,
    sessionId,
    signalQuality,
    smoothedSignal,
    startSampling,
    startedAt,
    status: samplingStatus,
    stopSampling,
    totalFingerLostCount,
    totalIgnoredFrameCount,
  } = usePulseFrameSampler({ stream, videoRef });
  const isCameraReady = status === "ready";
  const isRequestingCamera = status === "requesting";
  const isSampling = samplingStatus === "sampling";
  const showTorchStatus = torchState !== "unsupported";
  const canExportSignalData =
    samples.length > 0 &&
    cleanWindowDurationMs >= MIN_EXPORT_DURATION_MS &&
    startedAt !== null;
  const hasPulseEstimate = pulseEstimate.bpm !== null;
  const currentFingerStateNote =
    fingerGateState === "finger-lost"
      ? "Finger moved"
      : fingerGateLabels[fingerGateState];
  const estimateStateNote = pulseEstimate.usedLastCleanWindow
    ? "Using last clean window"
    : "Using current clean window";

  function handleCameraButtonClick() {
    if (isCameraReady) {
      stopSampling();
      stopCamera();
      return;
    }

    resetSamples();
    setCameraStatusAtStart(null);
    setTorchStateAtStart(null);
    startCamera();
  }

  function handleSignalButtonClick() {
    if (isSampling) {
      stopSampling();
      return;
    }

    if (samples.length === 0 || startedAt === null) {
      setCameraStatusAtStart(status);
      setTorchStateAtStart(torchState);
    }

    startSampling();
  }

  function handleExportSignalData() {
    if (!canExportSignalData || !startedAt) {
      return;
    }

    const report = buildPpgDebugReport({
      cameraStatusAtExport: status,
      cameraStatusAtStart: cameraStatusAtStart ?? status,
      cleanWindowFingerDetected,
      currentFingerDetected,
      fingerGateState,
      lastFingerLostAt,
      notes: [
        `Current state: ${currentFingerStateNote}`,
        `Estimate state: ${estimateStateNote}`,
        qualityMessage,
        pulseEstimate.message,
        `Signal clarity: ${signalQuality}`,
      ],
      pulseEstimate,
      recordingStartedAt,
      samples,
      sessionId,
      startedAt,
      torchStateAtExport: torchState,
      torchStateAtStart: torchStateAtStart ?? torchState,
      totalFingerLostCount,
      totalIgnoredFrameCount,
      usedLastCleanWindow: pulseEstimate.usedLastCleanWindow,
    });

    downloadPpgDebugReport(report);
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
          fingerGateState={fingerGateState}
          isSampling={isSampling}
          status={status}
          stream={stream}
          videoRef={videoRef}
        />
      </div>

      <div className="mt-4">
        <SignalPreview
          caption="Smoothed green-channel signal"
          delayMs={80}
          label="Live signal"
          liveSignal={smoothedSignal}
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
        <StatusBadge tone={fingerGateTones[fingerGateState]}>
          {fingerGateLabels[fingerGateState]}
        </StatusBadge>
        <StatusBadge tone={signalQualityTones[signalQuality]}>
          {signalQualityLabels[signalQuality]}
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
          detail={
            fingerGateState === "finger-lost"
              ? "Place your finger back over the camera."
              : fingerGateLabels[fingerGateState]
          }
          label="Finger gate"
          tone={fingerGateRowTones[fingerGateState]}
          value={fingerGateLabels[fingerGateState]}
        />
        <InfoRow
          delayMs={200}
          detail={qualityMessage}
          label="Signal clarity"
          tone={signalQualityRowTones[signalQuality]}
          value={signalQualityLabels[signalQuality]}
        />
        <InfoRow
          delayMs={240}
          detail={`${totalIgnoredFrameCount} total ignored frames / ${totalFingerLostCount} total finger-lost events`}
          label="Valid samples"
          tone="neutral"
          value={String(currentWindowValidSampleCount)}
        />
        {hasPulseEstimate ? (
          <InfoRow
            delayMs={280}
            detail={
              fingerGateState === "finger-lost" &&
              pulseEstimate.usedLastCleanWindow
                ? "Estimate based on last clean window. Non-medical estimate."
                : `Non-medical estimate / Estimate confidence: ${
                    pulseConfidenceLabels[pulseEstimate.confidence]
                  }`
            }
            label="Estimated pulse"
            tone={pulseConfidenceRowTones[pulseEstimate.confidence]}
            value={`${pulseEstimate.bpm} BPM`}
          />
        ) : (
          <InfoRow
            delayMs={280}
            detail={pulseEstimate.message}
            label="Estimate status"
            tone="warning"
            value={
              pulseEstimate.message.toLowerCase().includes("cleaner")
                ? "Need cleaner signal"
                : "Keep holding steady"
            }
          />
        )}
      </div>

      <div className="pt-4">
        <Button
          className="min-h-11 w-full text-sm"
          disabled={!canExportSignalData}
          onClick={handleExportSignalData}
          variant="ghost"
        >
          Export signal data
        </Button>
        <p className="mt-2 text-center text-xs leading-5 text-[#66706A]">
          Developer JSON export enables after about 5 seconds of signal data.
        </p>
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
          onClick={handleSignalButtonClick}
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
