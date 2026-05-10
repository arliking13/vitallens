export type StepId = "intro" | "pulse" | "breath" | "report";

export type StepDefinition = {
  id: StepId;
  label: string;
  shortLabel: string;
};

export type BreathRhythmLabel = "Steady" | "Uneven" | "Not enough motion";

export type BreathQualityLabel = "Good" | "Fair" | "Low";

export type BreathMotionResult = {
  durationSeconds: number;
  motionDetected: boolean;
  qualityLabel: BreathQualityLabel;
  rhythmLabel: BreathRhythmLabel;
  sampleCount: number;
};
