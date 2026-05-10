export type StepId = "intro" | "pulse" | "breath" | "report";

export type StepDefinition = {
  id: StepId;
  label: string;
  shortLabel: string;
};

export type BreathRhythmLabel = "Steady" | "Uneven" | "Not enough motion";

export type BreathQualityLabel = "Good" | "Fair" | "Low";

export type BreathCheckTelemetry = {
  motionMagnitude?: number[];
  motionMax?: number;
  motionMean?: number;
  motionMin?: number;
  motionRange?: number;
  motionStdDev?: number;
  motionX?: number[];
  motionY?: number[];
  motionZ?: number[];
  quality?: string;
  rhythm?: string;
  sampleCount?: number;
  sampleDurationMs?: number;
};

export type BreathMotionResult = {
  durationSeconds: number;
  motionDetected: boolean;
  qualityLabel: BreathQualityLabel;
  rhythmLabel: BreathRhythmLabel;
  sampleCount: number;
  telemetry?: BreathCheckTelemetry;
};

export type PulseConfidenceLabel = "low" | "fair" | "good";

export type PulseCheckTelemetry = {
  cleanWindowDurationMs?: number;
  confidence?: string;
  estimatedBpm?: number | null;
  sampleCount?: number;
  sampleDurationMs?: number;
  signal?: number[];
  signalMax?: number;
  signalMean?: number;
  signalMin?: number;
  signalQuality?: string;
  signalRange?: number;
  signalStdDev?: number;
  smoothedSignal?: number[];
};

export type PulseCheckResult = {
  bpm: number;
  confidence: PulseConfidenceLabel;
  sampleSeconds: number | null;
  signalLabel: "Clean";
  source: "Finger-camera signal";
  telemetry?: PulseCheckTelemetry;
};

export type WellnessReportPulseInput = {
  bpm: number;
  confidence: PulseConfidenceLabel;
  sampleSeconds: number | null;
  signalLabel: string;
  source: string;
  telemetry?: PulseCheckTelemetry;
};

export type WellnessReportBreathInput = {
  motionLabel: "Detected" | "Low";
  qualityLabel: BreathQualityLabel;
  rhythmLabel: BreathRhythmLabel;
  sampleSeconds: number;
  source: string;
  telemetry?: BreathCheckTelemetry;
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
