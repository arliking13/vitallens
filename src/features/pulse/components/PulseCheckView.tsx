"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { HeartIcon } from "@/shared/components/LineIcons";

import { CameraPreview } from "./CameraPreview";
import { PulseScanGuide } from "./PulseScanGuide";
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

function formatCleanWindowDuration(durationMs: number) {
  return `${Math.round(durationMs / 1000)}s`;
}

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
  isPulseCheckActive,
}: {
  hasPulseEstimate: boolean;
  isPulseCheckActive: boolean;
}) {
  if (hasPulseEstimate) {
    return "Estimate ready";
  }

  if (isPulseCheckActive) {
    return "Scanning pulse";
  }

  return "Place finger over sensor";
}

function getScannerDetail({
  hasPulseEstimate,
  isPulseCheckActive,
}: {
  hasPulseEstimate: boolean;
  isPulseCheckActive: boolean;
}) {
  if (hasPulseEstimate) {
    return "You can continue or hold a little longer.";
  }

  if (isPulseCheckActive) {
    return "Hold still for a cleaner reading.";
  }

  return "Cover the rear camera.";
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
  const [isScanGuideOpen, setIsScanGuideOpen] = useState(false);
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
  const isPulseCheckActive =
    status === "ready" && samplingStatus === "sampling" && !hasPulseEstimate;
  const currentFingerStateNote =
    fingerGateState === "finger-lost"
      ? "Finger moved"
      : fingerGateLabels[fingerGateState];
  const cleanWindowDurationLabel =
    cleanWindowDurationMs > 0
      ? formatCleanWindowDuration(cleanWindowDurationMs)
      : null;
  const estimateStateNote = pulseEstimate.usedLastCleanWindow
    ? "Using last clean window"
    : "Using current clean window";
  const showCameraPreview =
    previewPreference.enabled && previewPreference.stream === stream;
  const scannerTitle = getScannerTitle({
    hasPulseEstimate,
    isPulseCheckActive,
  });
  const scannerDetail = getScannerDetail({
    hasPulseEstimate,
    isPulseCheckActive,
  });

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
      <div>
        <h1 className="text-4xl font-bold leading-[1.03] tracking-normal text-[var(--vl-text)]">
          Pulse check
        </h1>
        <p className="mt-3 max-w-sm text-base leading-7 text-[var(--vl-text-muted)]">
          Cover the rear camera and hold still during the reading.
        </p>
        <Button
          className="mt-4 min-h-11 px-4 text-sm"
          onClick={() => setIsScanGuideOpen(true)}
          variant="secondary"
        >
          How to scan
        </Button>
      </div>

      <div className="mt-5">
        <CameraPreview
          delayMs={40}
          fingerGateState={fingerGateState}
          hasPulseEstimate={hasPulseEstimate}
          isPulseCheckActive={isPulseCheckActive}
          isSampling={isSampling}
          liveSignal={smoothedSignal}
          scannerDetail={scannerDetail}
          scannerTitle={scannerTitle}
          showCameraPreview={showCameraPreview}
          status={status}
          stream={stream}
          videoRef={videoRef}
        />
      </div>

      {hasPulseEstimate ? (
        <section className="vl-result-card animate-card-in mt-4 p-4">
          <div>
            <div className="flex items-start gap-3">
              <span className="vl-glass-icon h-14 w-14" aria-hidden="true">
                <HeartIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[var(--vl-text-muted)]">
                    Estimated pulse
                  </p>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-bold",
                      pulseEstimate.confidence === "good"
                        ? "border border-[#BDE5CB] bg-[var(--vl-success-soft)] text-[var(--vl-success)]"
                        : "vl-peach-pill",
                    ].join(" ")}
                  >
                    Confidence: {pulseEstimate.confidence}
                  </span>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-bold tracking-normal text-[var(--vl-text)]">
                    {pulseEstimate.bpm}
                  </span>
                  <span className="pb-1.5 text-base font-bold text-[var(--vl-text-muted)]">
                    BPM
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="vl-peach-pill px-3 py-1 text-xs font-bold">
                    Signal: Clean
                  </span>
                  {cleanWindowDurationLabel ? (
                    <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                      Sample: {cleanWindowDurationLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm leading-5 text-[var(--vl-text-muted)]">
              <p>Based on your best clean finger-camera signal.</p>
              <p>
                Wellness-only estimate. Not for medical decisions.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <details className="vl-glass mt-4 overflow-hidden rounded-[22px]">
        <summary className="interactive-press flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-[var(--vl-text)] marker:hidden">
          Debug details
          <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
            Hidden
          </span>
        </summary>
        <div className="grid gap-3 border-t border-[var(--vl-glass-border)] bg-white/30 p-3">
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

      <div className="pointer-events-none sticky bottom-0 z-20 -mx-5 mt-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-5">
        <div className="vl-action-dock pointer-events-auto space-y-2.5 p-2.5">
          <Button
            className="vl-dock-primary w-full"
            onClick={handlePulseCheckButtonClick}
          >
            {isCheckActive ? "Stop check" : "Start pulse check"}
          </Button>
          <div className="grid grid-cols-[0.85fr_1.15fr] gap-2.5">
            <Button
              className="vl-dock-back min-h-12 w-full text-sm"
              onClick={onBack}
              variant="ghost"
            >
              Back
            </Button>
            <Button
              className="vl-dock-continue min-h-12 w-full text-sm"
              disabled={!hasPulseEstimate}
              onClick={onNext}
              variant={hasPulseEstimate ? "primary" : "secondary"}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>

      {isScanGuideOpen ? (
        <PulseScanGuide onClose={() => setIsScanGuideOpen(false)} />
      ) : null}
    </div>
  );
}
