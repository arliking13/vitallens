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

export type PulseConfidenceLabel = "low" | "fair" | "good";

export type PulseCheckResult = {
  bpm: number;
  confidence: PulseConfidenceLabel;
  sampleSeconds: number | null;
  signalLabel: "Clean";
  source: "Finger-camera signal";
};

export type WellnessReportPulseInput = {
  bpm: number;
  confidence: PulseConfidenceLabel;
  sampleSeconds: number | null;
  signalLabel: string;
  source: string;
};

export type WellnessReportBreathInput = {
  motionLabel: "Detected" | "Low";
  qualityLabel: BreathQualityLabel;
  rhythmLabel: BreathRhythmLabel;
  sampleSeconds: number;
  source: string;
};

export type WellnessReportInput = {
  breath: WellnessReportBreathInput | null;
  pulse: WellnessReportPulseInput | null;
};

export type WellnessSummarySource = "ibm-watsonx" | "fallback";

export type WellnessSummaryResponse = {
  nextStep: string;
  observations: string[];
  source: WellnessSummarySource;
  summary: string;
};
