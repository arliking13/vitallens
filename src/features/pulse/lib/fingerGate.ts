import type { PpgSample } from "./ppgSampler";

export type FingerGateState =
  | "waiting-for-finger"
  | "stabilizing"
  | "recording"
  | "finger-lost";

export type FingerGateDecision = {
  covered: boolean;
  nextState: FingerGateState;
  shouldRecord: boolean;
  shouldResetSession: boolean;
  shouldTrimRecentSamples: boolean;
  stabilizationStartedAt: number | null;
};

type EvaluateFingerGateOptions = {
  previousSample: PpgSample | null;
  sample: PpgSample;
  state: FingerGateState;
  stabilizationStartedAt: number | null;
};

const STABILIZATION_MS = 1000;
const MAX_BRIGHTNESS_STEP = 18;

function hasCoveredColorProfile(sample: PpgSample) {
  const redHigh = sample.red >= 95;
  const blueLow = sample.blue <= 85;
  const redDominatesBlue = sample.red >= sample.blue * 1.8;
  const redDominatesGreen = sample.red >= sample.green * 1.02;
  const coveredBrightness = sample.brightness >= 35 && sample.brightness <= 230;

  return (
    redHigh &&
    blueLow &&
    redDominatesBlue &&
    redDominatesGreen &&
    coveredBrightness
  );
}

function hasStableBrightness(
  sample: PpgSample,
  previousSample: PpgSample | null,
) {
  if (!previousSample) {
    return true;
  }

  return (
    Math.abs(sample.brightness - previousSample.brightness) <=
    MAX_BRIGHTNESS_STEP
  );
}

export function isLikelyFingerCovered(
  sample: PpgSample,
  previousSample: PpgSample | null,
) {
  return (
    hasCoveredColorProfile(sample) &&
    hasStableBrightness(sample, previousSample)
  );
}

export function evaluateFingerGate({
  previousSample,
  sample,
  stabilizationStartedAt,
  state,
}: EvaluateFingerGateOptions): FingerGateDecision {
  const covered = isLikelyFingerCovered(sample, previousSample);

  if (!covered) {
    return {
      covered: false,
      nextState:
        state === "recording" ||
        state === "stabilizing" ||
        state === "finger-lost"
          ? "finger-lost"
          : "waiting-for-finger",
      shouldRecord: false,
      shouldResetSession: false,
      shouldTrimRecentSamples: state === "recording",
      stabilizationStartedAt: null,
    };
  }

  const nextStabilizationStartedAt = stabilizationStartedAt ?? sample.t;
  const hasStabilized =
    sample.t - nextStabilizationStartedAt >= STABILIZATION_MS;

  if (hasStabilized) {
    return {
      covered: true,
      nextState: "recording",
      shouldRecord: true,
      shouldResetSession: state === "finger-lost",
      shouldTrimRecentSamples: false,
      stabilizationStartedAt: nextStabilizationStartedAt,
    };
  }

  return {
    covered: true,
    nextState: "stabilizing",
    shouldRecord: false,
    shouldResetSession: state === "finger-lost",
    shouldTrimRecentSamples: false,
    stabilizationStartedAt: nextStabilizationStartedAt,
  };
}

export function getFingerGateMessage(state: FingerGateState) {
  if (state === "recording") {
    return "Recording clean signal";
  }

  if (state === "stabilizing") {
    return "Hold steady";
  }

  if (state === "finger-lost") {
    return "Finger moved - hold steady again";
  }

  return "Place finger over camera";
}
