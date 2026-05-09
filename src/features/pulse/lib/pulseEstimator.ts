import { movingAverage } from "./ppgFilters";
import type { PulseSignalQuality } from "./pulseQuality";
import type { PpgSample } from "./ppgSampler";

export type PulseEstimateConfidence = "low" | "fair" | "good";

export type PulseEstimate = {
  bpm: number | null;
  confidence: PulseEstimateConfidence;
  confidenceScore: number;
  method: "autocorrelation";
  message: string;
  rawBpmCandidate: number | null;
  correctedBpm: number | null;
  harmonicCorrected: boolean;
  autocorrelationStrength: number;
};

type EstimatePulseOptions = {
  fingerDetected: boolean;
  normalizedSignal?: number[];
  samples: PpgSample[];
  signalQuality: PulseSignalQuality;
};

const MIN_DURATION_MS = 15000;
const MIN_BPM = 45;
const MAX_BPM = 160;
const MIN_CORRELATION = 0.24;
const HARMONIC_CORRECTION_BPM = 120;
const BRIGHTNESS_ARTIFACT_RANGE = 30;

function emptyEstimate(message: string): PulseEstimate {
  return {
    bpm: null,
    confidence: "low",
    confidenceScore: 0,
    method: "autocorrelation",
    message,
    rawBpmCandidate: null,
    correctedBpm: null,
    harmonicCorrected: false,
    autocorrelationStrength: 0,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function range(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function getBrightnessRange(samples: PpgSample[]) {
  return range(samples.map((sample) => sample.brightness));
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function getDurationMs(samples: PpgSample[]) {
  if (samples.length < 2) {
    return 0;
  }

  return Math.max(0, samples[samples.length - 1].t - samples[0].t);
}

function estimateFps(samples: PpgSample[]) {
  const durationMs = getDurationMs(samples);
  if (samples.length < 2 || durationMs <= 0) {
    return 0;
  }

  return ((samples.length - 1) / durationMs) * 1000;
}

function normalizeToZeroMean(values: number[]) {
  const mean = average(values);
  const deviation = standardDeviation(values);

  if (deviation < 0.000001) {
    return values.map(() => 0);
  }

  return values.map((value) => (value - mean) / deviation);
}

function selectSignal(samples: PpgSample[], normalizedSignal?: number[]) {
  const greenSignal = samples.map((sample) => sample.green);

  if (range(greenSignal) > 0.5) {
    return greenSignal;
  }

  if (normalizedSignal && normalizedSignal.length >= samples.length * 0.8) {
    const recentNormalized = normalizedSignal.slice(-samples.length);
    if (range(recentNormalized) > 0.001) {
      return recentNormalized;
    }
  }

  return samples.map((sample) => sample.brightness);
}

function preprocessSignal(values: number[], fps: number) {
  const highFrequencyWindow = Math.max(3, Math.round(fps * 0.12));
  const baselineWindow = Math.max(
    highFrequencyWindow + 2,
    Math.round(fps * 1.8),
  );
  const firstPass = movingAverage(values, highFrequencyWindow);
  const baseline = movingAverage(firstPass, baselineWindow);
  const detrended = firstPass.map((value, index) => value - baseline[index]);
  const smoothedDetrended = movingAverage(detrended, highFrequencyWindow);

  return normalizeToZeroMean(smoothedDetrended);
}

function autocorrelationAtLag(values: number[], lag: number) {
  let numerator = 0;
  let leadingPower = 0;
  let laggedPower = 0;

  for (let index = lag; index < values.length; index += 1) {
    const leading = values[index];
    const lagged = values[index - lag];
    numerator += leading * lagged;
    leadingPower += leading ** 2;
    laggedPower += lagged ** 2;
  }

  const denominator = Math.sqrt(leadingPower * laggedPower);
  return denominator > 0 ? numerator / denominator : 0;
}

function getConfidence(score: number): PulseEstimateConfidence {
  if (score >= 0.52) {
    return "good";
  }

  if (score >= 0.35) {
    return "fair";
  }

  return "low";
}

function limitConfidence(
  confidence: PulseEstimateConfidence,
  maxConfidence: PulseEstimateConfidence,
) {
  const confidenceRank: Record<PulseEstimateConfidence, number> = {
    low: 0,
    fair: 1,
    good: 2,
  };

  return confidenceRank[confidence] <= confidenceRank[maxConfidence]
    ? confidence
    : maxConfidence;
}

function maybeApplyHarmonicCorrection({
  bestLag,
  bestScore,
  fps,
  maxLag,
  processedSignal,
}: {
  bestLag: number;
  bestScore: number;
  fps: number;
  maxLag: number;
  processedSignal: number[];
}) {
  const rawBpm = (60 * fps) / bestLag;
  const halfLag = bestLag * 2;

  if (rawBpm <= HARMONIC_CORRECTION_BPM || halfLag > maxLag) {
    return {
      selectedLag: bestLag,
      selectedScore: bestScore,
      harmonicCorrected: false,
    };
  }

  const halfScore = autocorrelationAtLag(processedSignal, halfLag);
  const halfScoreIsReasonable =
    halfScore >= MIN_CORRELATION && halfScore >= bestScore * 0.5;

  if (!halfScoreIsReasonable) {
    return {
      selectedLag: bestLag,
      selectedScore: bestScore,
      harmonicCorrected: false,
    };
  }

  return {
    selectedLag: halfLag,
    selectedScore: halfScore,
    harmonicCorrected: true,
  };
}

export function estimatePulseFromSamples({
  fingerDetected,
  normalizedSignal,
  samples,
  signalQuality,
}: EstimatePulseOptions): PulseEstimate {
  const durationMs = getDurationMs(samples);

  if (durationMs < MIN_DURATION_MS || samples.length < 120) {
    return emptyEstimate("Keep holding steady for a longer signal window.");
  }

  if (!fingerDetected || signalQuality === "no-signal") {
    return emptyEstimate("Need cleaner signal before estimating pulse.");
  }

  const fps = estimateFps(samples);
  if (fps <= 0) {
    return emptyEstimate("Need cleaner timing before estimating pulse.");
  }

  const rawSignal = selectSignal(samples, normalizedSignal);
  const processedSignal = preprocessSignal(rawSignal, fps);
  const minLag = Math.max(1, Math.ceil((fps * 60) / MAX_BPM));
  const maxLag = Math.min(
    processedSignal.length - 2,
    Math.floor((fps * 60) / MIN_BPM),
  );

  if (maxLag <= minLag) {
    return emptyEstimate("Need a longer signal before estimating pulse.");
  }

  let bestLag = minLag;
  let bestScore = -1;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const score = autocorrelationAtLag(processedSignal, lag);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  const confidenceScore = Math.max(0, Math.min(1, bestScore));
  if (confidenceScore < MIN_CORRELATION) {
    return {
      bpm: null,
      confidence: "low",
      confidenceScore,
      method: "autocorrelation",
      message: "Need cleaner signal before estimating pulse.",
      rawBpmCandidate: Math.round((60 * fps) / bestLag),
      correctedBpm: null,
      harmonicCorrected: false,
      autocorrelationStrength: confidenceScore,
    };
  }

  const correctedCandidate = maybeApplyHarmonicCorrection({
    bestLag,
    bestScore,
    fps,
    maxLag,
    processedSignal,
  });
  const rawBpmCandidate = Math.round((60 * fps) / bestLag);
  const correctedBpm = Math.round((60 * fps) / correctedCandidate.selectedLag);
  const brightnessRange = getBrightnessRange(samples);
  const artifactAdjustedScore =
    brightnessRange > BRIGHTNESS_ARTIFACT_RANGE
      ? correctedCandidate.selectedScore * 0.78
      : correctedCandidate.selectedScore;
  const adjustedConfidenceScore = Math.max(
    0,
    Math.min(1, artifactAdjustedScore),
  );
  const hasBrightnessArtifact = brightnessRange > BRIGHTNESS_ARTIFACT_RANGE;
  let confidence = getConfidence(adjustedConfidenceScore);

  if (correctedCandidate.harmonicCorrected || hasBrightnessArtifact) {
    confidence = limitConfidence(confidence, "fair");
  }
  const message = hasBrightnessArtifact
    ? "Signal changed sharply. Hold your finger steadier for a cleaner estimate."
    : confidence === "low"
      ? "Keep holding steady while the estimate settles."
      : "Non-medical estimate available from the current signal.";

  return {
    bpm: correctedBpm,
    confidence,
    confidenceScore: adjustedConfidenceScore,
    method: "autocorrelation",
    message,
    rawBpmCandidate,
    correctedBpm,
    harmonicCorrected: correctedCandidate.harmonicCorrected,
    autocorrelationStrength: Math.max(
      0,
      Math.min(1, correctedCandidate.selectedScore),
    ),
  };
}
