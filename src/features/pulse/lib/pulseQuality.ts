import type { PpgSample } from "./ppgSampler";

export type PulseSignalQuality =
  | "no-signal"
  | "too-dark"
  | "too-bright"
  | "unstable"
  | "fair"
  | "good";

export type PulseQualityAnalysis = {
  fingerDetected: boolean;
  qualityMessage: string;
  signalQuality: PulseSignalQuality;
};

const MIN_QUALITY_SAMPLES = 24;
const RECENT_SAMPLE_COUNT = 120;

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
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function averageStepChange(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const changes = values
    .slice(1)
    .map((value, index) => Math.abs(value - values[index]));

  return average(changes);
}

function hasFingerColorProfile(samples: PpgSample[], brightnessAverage: number) {
  const redAverage = average(samples.map((sample) => sample.red));
  const greenAverage = average(samples.map((sample) => sample.green));
  const blueAverage = average(samples.map((sample) => sample.blue));
  const redDominant = redAverage > greenAverage * 1.02 && redAverage > blueAverage * 1.08;
  const usableBrightness = brightnessAverage > 18 && brightnessAverage < 245;

  return usableBrightness && redDominant;
}

export function analyzePulseSignalQuality(
  samples: PpgSample[],
): PulseQualityAnalysis {
  const recentSamples = samples.slice(-RECENT_SAMPLE_COUNT);

  if (recentSamples.length < MIN_QUALITY_SAMPLES) {
    return {
      fingerDetected: false,
      qualityMessage: "Start the signal and place your finger over the camera.",
      signalQuality: "no-signal",
    };
  }

  const brightnessValues = recentSamples.map((sample) => sample.brightness);
  const greenValues = recentSamples.map((sample) => sample.green);
  const brightnessAverage = average(brightnessValues);
  const brightnessStdDev = Math.sqrt(variance(brightnessValues));
  const brightnessChange = averageStepChange(brightnessValues);
  const brightnessRange = range(brightnessValues);
  const greenRange = range(greenValues);
  const fingerDetected = hasFingerColorProfile(recentSamples, brightnessAverage);

  if (brightnessAverage < 18) {
    return {
      fingerDetected,
      qualityMessage: "The camera view is very dark. Try covering the lens with light pressure.",
      signalQuality: "too-dark",
    };
  }

  if (brightnessAverage > 245) {
    return {
      fingerDetected,
      qualityMessage: "The camera view is very bright. Ease finger pressure slightly.",
      signalQuality: "too-bright",
    };
  }

  if (!fingerDetected) {
    return {
      fingerDetected: false,
      qualityMessage: "Place finger over camera.",
      signalQuality: "no-signal",
    };
  }

  if (
    brightnessRange > 30 ||
    brightnessStdDev > 28 ||
    brightnessChange > 16
  ) {
    return {
      fingerDetected: true,
      qualityMessage:
        "Signal changed sharply. Hold your finger steadier for a cleaner estimate.",
      signalQuality: "unstable",
    };
  }

  if (
    recentSamples.length >= 80 &&
    greenRange >= 3 &&
    brightnessRange <= 30 &&
    brightnessStdDev < 18
  ) {
    return {
      fingerDetected: true,
      qualityMessage: "Signal looks steady enough for the next step.",
      signalQuality: "good",
    };
  }

  return {
    fingerDetected: true,
    qualityMessage: "Signal is visible. Hold steady for a cleaner preview.",
    signalQuality: "fair",
  };
}
