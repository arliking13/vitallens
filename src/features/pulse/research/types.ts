import type { PulseEstimateConfidence } from "../lib/pulseEstimator";

export type ReferencePpgSample = {
  t?: number;
  ppg?: number;
  red?: number;
  green?: number;
  blue?: number;
  brightness?: number;
};

export type ReferencePpgRecord = {
  recordId: string;
  samples: ReferencePpgSample[];
  referenceBpm: number;
  qualityLabel: string | null;
  source: string;
  samplingHz: number;
  notes?: string[];
};

export type PulseValidationResult = {
  recordId: string;
  referenceBpm: number;
  estimatedBpm: number | null;
  absoluteError: number | null;
  confidence: PulseEstimateConfidence;
  confidenceScore: number;
  returnedEstimate: boolean;
  qualityLabel: string | null;
  source: string;
};

export type PulseValidationConfidenceSummary = {
  recordCount: number;
  returnedEstimateCount: number;
  meanAbsoluteError: number | null;
  medianAbsoluteError: number | null;
  withinFiveBpmPercent: number | null;
  withinTenBpmPercent: number | null;
};

export type PulseValidationSummary = {
  recordCount: number;
  returnedEstimateCount: number;
  falseNullCount: number;
  falseNullRate: number | null;
  badSignalRecordCount: number;
  badSignalRejectedCount: number;
  badSignalRejectionRate: number | null;
  meanAbsoluteError: number | null;
  medianAbsoluteError: number | null;
  withinFiveBpmPercent: number | null;
  withinTenBpmPercent: number | null;
  byConfidence: Record<
    PulseEstimateConfidence,
    PulseValidationConfidenceSummary
  >;
};

export type PulseValidationEvaluation = {
  results: PulseValidationResult[];
  summary: PulseValidationSummary;
};
