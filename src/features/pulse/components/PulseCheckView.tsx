"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";

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

type PreviewPreference = {
  enabled: boolean;
  stream: MediaStream | null;
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

const signalQualityRowTones = {
  "no-signal": "neutral",
  "too-dark": "warning",
  "too-bright": "warning",
  unstable: "warning",
  fair: "pulse",
  good: "brand",
} as const;

function getScannerTitle({
  hasPulseEstimate,
  isSampling,
  signalQuality,
  fingerGateState,
}: {
  hasPulseEstimate: boolean;
  isSampling: boolean;
  signalQuality: keyof typeof signalQualityLabels;
  fingerGateState: keyof typeof fingerGateLabels;
}) {
  if (hasPulseEstimate) {
    return "Estimate ready";
  }

  if (!isSampling) {
    return "Place finger over sensor";
  }

  if (fingerGateState === "stabilizing") {
    return "Hold steady";
  }

  if (fingerGateState === "recording") {
    return "Recording clean signal";
  }

  if (fingerGateState === "finger-lost") {
    return "Place finger over sensor";
  }

  if (
    signalQuality === "unstable" ||
    signalQuality === "too-dark" ||
    signalQuality === "too-bright"
  ) {
    return "Need cleaner signal";
  }

  return "Place finger over sensor";
}

function getScannerDetail({
  hasPulseEstimate,
  isSampling,
  pulseMessage,
  scannerTitle,
}: {
  hasPulseEstimate: boolean;
  isSampling: boolean;
  pulseMessage: string;
  scannerTitle: string;
}) {
  if (hasPulseEstimate) {
    return "You can continue or hold a little longer for another clean window.";
  }

  if (!isSampling) {
    return "Start the check, cover the rear camera, and keep your finger still.";
  }

  if (scannerTitle === "Need cleaner signal") {
    return pulseMessage;
  }

  return "About 20 seconds gives a cleaner estimate.";
}

export function PulseCheckView({ onBack, onNext }: PulseCheckViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shouldAutoStartSignalRef = useRef(false);
  const cameraStatusAtStartRef = useRef<CameraStatus | null>(null);
  const torchStateAtStartRef = useRef<TorchState | null>(null);
  const [previewPreference, setPreviewPreference] = useState<PreviewPreference>({
    enabled: false,
    stream: null,
  });
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
  const isCheckActive = isRequestingCamera || isCameraReady || isSampling;
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
  const showCameraPreview =
    previewPreference.enabled && previewPreference.stream === stream;
  const scannerTitle = getScannerTitle({
    fingerGateState,
    hasPulseEstimate,
    isSampling,
    signalQuality,
  });
  const scannerDetail = getScannerDetail({
    hasPulseEstimate,
    isSampling,
    pulseMessage: pulseEstimate.message,
    scannerTitle,
  });
  const scannerLabel = hasPulseEstimate
    ? "Ready"
    : isSampling
      ? fingerGateLabels[fingerGateState]
      : cameraStatusLabels[status];

  useEffect(() => {
    if (!shouldAutoStartSignalRef.current) {
      return;
    }

    if (status === "denied" || status === "error") {
      shouldAutoStartSignalRef.current = false;
      return;
    }

    if (status !== "ready" || !stream || isSampling) {
      return;
    }

    cameraStatusAtStartRef.current = status;
    torchStateAtStartRef.current = torchState;
    startSampling();
    shouldAutoStartSignalRef.current = false;
  }, [isSampling, startSampling, status, stream, torchState]);

  function handlePulseCheckButtonClick() {
    if (isCheckActive) {
      shouldAutoStartSignalRef.current = false;
      stopSampling();
      stopCamera();
      return;
    }

    resetSamples();
    cameraStatusAtStartRef.current = null;
    torchStateAtStartRef.current = null;
    shouldAutoStartSignalRef.current = true;
    void startCamera();
  }

  function handleToggleCameraPreview() {
    setPreviewPreference({
      enabled: !showCameraPreview,
      stream,
    });
  }

  function handleExportSignalData() {
    if (!canExportSignalData || !startedAt) {
      return;
    }

    const report = buildPpgDebugReport({
      cameraStatusAtExport: status,
      cameraStatusAtStart: cameraStatusAtStartRef.current ?? status,
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
      torchStateAtStart: torchStateAtStartRef.current ?? torchState,
      totalFingerLostCount,
      totalIgnoredFrameCount,
      usedLastCleanWindow: pulseEstimate.usedLastCleanWindow,
    });

    downloadPpgDebugReport(report);
  }

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pb-32">
      <ScreenHeader
        description="Rest your finger over the rear camera and stay still during the reading."
        status="Camera check"
        title="Pulse check"
        tone="pulse"
      />

      <div className="mt-5">
        <CameraPreview
          delayMs={40}
          fingerGateState={fingerGateState}
          isSampling={isSampling}
          liveSignal={smoothedSignal}
          scannerDetail={scannerDetail}
          scannerLabel={scannerLabel}
          scannerTitle={scannerTitle}
          showCameraPreview={showCameraPreview}
          status={status}
          stream={stream}
          videoRef={videoRef}
        />
      </div>

      <section className="animate-card-in mt-4 rounded-[24px] border border-[#E5EAE4] bg-white p-4 shadow-[0_14px_34px_rgba(28,37,32,0.045)]">
        {hasPulseEstimate ? (
          <div>
            <p className="text-sm font-semibold text-[#66706A]">
              Estimated pulse
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-normal text-[#1C2520]">
                {pulseEstimate.bpm}
              </span>
              <span className="pb-1 text-base font-semibold text-[#66706A]">
                BPM
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#66706A]">
              Estimate confidence: {pulseEstimate.confidence}. Non-medical
              wellness estimate.
            </p>
            {fingerGateState === "finger-lost" &&
            pulseEstimate.usedLastCleanWindow ? (
              <p className="mt-2 text-sm leading-6 text-[#66706A]">
                Estimate based on last clean window.
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold text-[#1C2520]">
              {scannerTitle === "Need cleaner signal"
                ? "Need cleaner signal"
                : "Keep holding steady"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#66706A]">
              {scannerTitle === "Need cleaner signal"
                ? pulseEstimate.message
                : "About 20 seconds gives a cleaner estimate."}
            </p>
          </div>
        )}
      </section>

      <details className="mt-4 overflow-hidden rounded-[22px] border border-[#E5EAE4] bg-white shadow-[0_12px_30px_rgba(28,37,32,0.035)]">
        <summary className="interactive-press flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-[#1C2520] marker:hidden">
          Debug details
          <span className="rounded-full bg-[#F5F7F4] px-3 py-1 text-xs font-semibold text-[#66706A]">
            Hidden
          </span>
        </summary>
        <div className="grid gap-3 border-t border-[#E5EAE4] bg-[#FBFCFA] p-3">
          <InfoRow
            delayMs={40}
            detail={error ?? undefined}
            label="Camera status"
            tone={
              status === "denied" || status === "error" ? "warning" : "pulse"
            }
            value={cameraStatusLabels[status]}
          />
          <InfoRow
            delayMs={60}
            detail={samplingError ?? undefined}
            label="Frame sampler"
            tone={samplingStatus === "error" ? "warning" : "pulse"}
            value={samplingStatusLabels[samplingStatus]}
          />
          <InfoRow
            delayMs={80}
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
            delayMs={100}
            detail={qualityMessage}
            label="Signal clarity"
            tone={signalQualityRowTones[signalQuality]}
            value={signalQualityLabels[signalQuality]}
          />
          <InfoRow
            delayMs={120}
            detail={`${totalIgnoredFrameCount} ignored frames / ${totalFingerLostCount} finger-lost events`}
            label="Valid samples"
            tone="neutral"
            value={String(currentWindowValidSampleCount)}
          />
          {showTorchStatus ? (
            <InfoRow
              delayMs={140}
              label="Torch"
              tone={torchState === "on" ? "pulse" : "warning"}
              value={torchStatusLabels[torchState]}
            />
          ) : null}
          <Button
            className="min-h-11 w-full text-sm"
            disabled={!stream}
            onClick={handleToggleCameraPreview}
            variant="ghost"
          >
            {showCameraPreview ? "Hide camera preview" : "Show camera preview"}
          </Button>
          <Button
            className="min-h-11 w-full text-sm"
            disabled={!canExportSignalData}
            onClick={handleExportSignalData}
            variant="ghost"
          >
            Export signal data
          </Button>
        </div>
      </details>

      <div className="sticky bottom-0 z-20 -mx-5 mt-auto border-t border-[#E5EAE4] bg-[#F5F7F4]/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur-xl">
        <div className="space-y-3">
          <Button className="w-full" onClick={handlePulseCheckButtonClick}>
            {isCheckActive ? "Stop check" : "Start pulse check"}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button className="w-full" onClick={onBack} variant="ghost">
              Back
            </Button>
            <Button
              className="w-full"
              onClick={onNext}
              variant={hasPulseEstimate ? "primary" : "secondary"}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
