import type { CameraStatus, TorchState } from "../hooks/useRearCamera";
import type { FingerGateState } from "./fingerGate";
import type { PulseEstimate } from "./pulseEstimator";
import type { PpgSample } from "./ppgSampler";

export type PpgDebugSample = PpgSample & {
  normalizedSignal: number;
};

export type PpgDebugQuality = {
  brightnessAverage: number;
  brightnessMin: number;
  brightnessMax: number;
  brightnessRange: number;
  signalMin: number;
  signalMax: number;
  signalRange: number;
  variance: number;
  droppedFrameEstimate: number;
  fingerDetected: boolean;
  notes: string[];
};

export type PpgDebugReport = {
  sessionId: string;
  startedAt: string;
  durationMs: number;
  sampleCount: number;
  estimatedFps: number;
  cameraStatusAtStart: CameraStatus;
  cameraStatusAtExport: CameraStatus;
  torchStateAtStart: TorchState;
  torchStateAtExport: TorchState;
  fingerGateState: FingerGateState;
  cleanWindowStartedAt: number | null;
  cleanWindowDurationMs: number;
  currentWindowValidSampleCount: number;
  totalIgnoredFrameCount: number;
  totalFingerLostCount: number;
  recordingStartedAt: number | null;
  lastFingerLostAt: number | null;
  pulseEstimate: PulseEstimate;
  samples: PpgDebugSample[];
  quality: PpgDebugQuality;
};

type BuildPpgDebugReportOptions = {
  cameraStatusAtExport: CameraStatus;
  cameraStatusAtStart: CameraStatus;
  fingerDetected: boolean;
  fingerGateState: FingerGateState;
  totalFingerLostCount: number;
  totalIgnoredFrameCount: number;
  lastFingerLostAt: number | null;
  notes?: string[];
  pulseEstimate: PulseEstimate;
  recordingStartedAt: number | null;
  samples: PpgSample[];
  sessionId: string;
  startedAt: string;
  torchStateAtExport: TorchState;
  torchStateAtStart: TorchState;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
}

function range(values: number[]) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      range: 0,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    min,
    max,
    range: max - min,
  };
}

function normalizeValues(values: number[]) {
  const stats = range(values);

  if (values.length === 0) {
    return [];
  }

  if (stats.range < 0.001) {
    return values.map(() => 0.5);
  }

  return values.map((value) => (value - stats.min) / stats.range);
}

function getDurationMs(samples: PpgSample[]) {
  if (samples.length < 2) {
    return 0;
  }

  return Math.max(0, samples[samples.length - 1].t - samples[0].t);
}

function getCleanWindowStartedAt(samples: PpgSample[]) {
  return samples[0]?.t ?? null;
}

function getEstimatedFps(samples: PpgSample[], durationMs: number) {
  if (samples.length < 2 || durationMs <= 0) {
    return 0;
  }

  return ((samples.length - 1) / durationMs) * 1000;
}

function estimateDroppedFrames(samples: PpgSample[]) {
  if (samples.length < 3) {
    return 0;
  }

  const intervals = samples
    .slice(1)
    .map((sample, index) => sample.t - samples[index].t)
    .filter((interval) => interval > 0);

  const expectedInterval = average(intervals);
  if (expectedInterval <= 0) {
    return 0;
  }

  return intervals.reduce((droppedFrames, interval) => {
    const missedFrames = Math.max(0, Math.round(interval / expectedInterval) - 1);
    return droppedFrames + missedFrames;
  }, 0);
}

function formatNumber(value: number) {
  return Number(value.toFixed(4));
}

function buildFileTimestamp(startedAt: string) {
  const parsedDate = new Date(startedAt);
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return safeDate.toISOString().slice(0, 19).replace(/:/g, "-");
}

export function buildPpgDebugReport({
  cameraStatusAtExport,
  cameraStatusAtStart,
  fingerDetected,
  fingerGateState,
  lastFingerLostAt,
  notes = [],
  pulseEstimate,
  recordingStartedAt,
  samples,
  sessionId,
  startedAt,
  torchStateAtExport,
  torchStateAtStart,
  totalFingerLostCount,
  totalIgnoredFrameCount,
}: BuildPpgDebugReportOptions): PpgDebugReport {
  const greenValues = samples.map((sample) => sample.green);
  const brightnessValues = samples.map((sample) => sample.brightness);
  const normalizedValues = normalizeValues(greenValues);
  const brightnessStats = range(brightnessValues);
  const signalStats = range(normalizedValues);
  const cleanWindowDurationMs = getDurationMs(samples);
  const cleanWindowStartedAt = getCleanWindowStartedAt(samples);
  const currentRecordingStartedAt = cleanWindowStartedAt ?? recordingStartedAt;

  return {
    sessionId,
    startedAt,
    durationMs: formatNumber(cleanWindowDurationMs),
    sampleCount: samples.length,
    estimatedFps: formatNumber(getEstimatedFps(samples, cleanWindowDurationMs)),
    cameraStatusAtStart,
    cameraStatusAtExport,
    torchStateAtStart,
    torchStateAtExport,
    fingerGateState,
    cleanWindowStartedAt:
      cleanWindowStartedAt === null ? null : formatNumber(cleanWindowStartedAt),
    cleanWindowDurationMs: formatNumber(cleanWindowDurationMs),
    currentWindowValidSampleCount: samples.length,
    totalIgnoredFrameCount,
    totalFingerLostCount,
    recordingStartedAt:
      currentRecordingStartedAt === null
        ? null
        : formatNumber(currentRecordingStartedAt),
    lastFingerLostAt:
      lastFingerLostAt === null ? null : formatNumber(lastFingerLostAt),
    pulseEstimate: {
      ...pulseEstimate,
      confidenceScore: formatNumber(pulseEstimate.confidenceScore),
      autocorrelationStrength: formatNumber(
        pulseEstimate.autocorrelationStrength,
      ),
      frequencyStrength: formatNumber(pulseEstimate.frequencyStrength),
    },
    samples: samples.map((sample, index) => ({
      t: formatNumber(sample.t),
      red: formatNumber(sample.red),
      green: formatNumber(sample.green),
      blue: formatNumber(sample.blue),
      brightness: formatNumber(sample.brightness),
      normalizedSignal: formatNumber(normalizedValues[index] ?? 0),
    })),
    quality: {
      brightnessAverage: formatNumber(average(brightnessValues)),
      brightnessMin: formatNumber(brightnessStats.min),
      brightnessMax: formatNumber(brightnessStats.max),
      brightnessRange: formatNumber(brightnessStats.range),
      signalMin: formatNumber(signalStats.min),
      signalMax: formatNumber(signalStats.max),
      signalRange: formatNumber(signalStats.range),
      variance: formatNumber(variance(normalizedValues)),
      droppedFrameEstimate: estimateDroppedFrames(samples),
      fingerDetected,
      notes,
    },
  };
}

export function downloadPpgDebugReport(report: PpgDebugReport) {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `vitallens-ppg-session-${buildFileTimestamp(
    report.startedAt,
  )}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
