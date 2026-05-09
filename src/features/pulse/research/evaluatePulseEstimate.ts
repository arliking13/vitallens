import { estimatePulseFromSamples } from "../lib/pulseEstimator";
import { analyzePulseSignalQuality } from "../lib/pulseQuality";
import type { PulseSignalQuality } from "../lib/pulseQuality";
import type { PpgSample } from "../lib/ppgSampler";
import type {
  PulseValidationConfidenceSummary,
  PulseValidationEvaluation,
  PulseValidationResult,
  PulseValidationSummary,
  ReferencePpgRecord,
  ReferencePpgSample,
} from "./types";

const CONFIDENCE_LEVELS = ["low", "fair", "good"] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sortedValues = [...values].sort((first, second) => first - second);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
  }

  return sortedValues[midpoint];
}

function percent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function getPrimaryValue(sample: ReferencePpgSample) {
  return (
    sample.green ??
    sample.ppg ??
    sample.brightness ??
    sample.red ??
    sample.blue ??
    0
  );
}

function range(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function normalizePrimaryValues(samples: ReferencePpgSample[]) {
  const values = samples.map(getPrimaryValue);
  const minValue = Math.min(...values);
  const valueRange = range(values);

  if (valueRange < 0.000001) {
    return values.map(() => 0.5);
  }

  return values.map((value) => (value - minValue) / valueRange);
}

function getBrightness(red: number, green: number, blue: number) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function getSampleTimestamp({
  index,
  sample,
  samplingHz,
}: {
  index: number;
  sample: ReferencePpgSample;
  samplingHz: number;
}) {
  if (isFiniteNumber(sample.t)) {
    return sample.t;
  }

  if (samplingHz <= 0) {
    return index;
  }

  return (index / samplingHz) * 1000;
}

export function toEstimatorSamples(record: ReferencePpgRecord): PpgSample[] {
  const normalizedValues = normalizePrimaryValues(record.samples);

  return record.samples.map((sample, index) => {
    const normalizedValue = normalizedValues[index] ?? 0.5;
    const syntheticGreen = 120 + (normalizedValue - 0.5) * 24;
    const syntheticRed = 160 + (normalizedValue - 0.5) * 16;
    const syntheticBlue = 42 + (normalizedValue - 0.5) * 4;
    const red = sample.red ?? syntheticRed;
    const green = sample.green ?? syntheticGreen;
    const blue = sample.blue ?? syntheticBlue;

    return {
      t: getSampleTimestamp({
        index,
        sample,
        samplingHz: record.samplingHz,
      }),
      red,
      green,
      blue,
      brightness: sample.brightness ?? getBrightness(red, green, blue),
    };
  });
}

function normalizeQualityLabel(qualityLabel: string | null) {
  return qualityLabel?.trim().toLowerCase() ?? "";
}

function isBadSignalQualityLabel(qualityLabel: string | null) {
  const label = normalizeQualityLabel(qualityLabel);

  return (
    label === "0" ||
    label.includes("bad") ||
    label.includes("poor") ||
    label.includes("reject") ||
    label.includes("unusable") ||
    label.includes("invalid")
  );
}

function getReferenceSignalQuality(
  record: ReferencePpgRecord,
  samples: PpgSample[],
): PulseSignalQuality {
  const label = normalizeQualityLabel(record.qualityLabel);

  if (isBadSignalQualityLabel(record.qualityLabel)) {
    return "no-signal";
  }

  if (
    label.includes("good") ||
    label.includes("excellent") ||
    label.includes("usable") ||
    label === "3" ||
    label === "4" ||
    label === "5"
  ) {
    return "good";
  }

  if (
    label.includes("fair") ||
    label.includes("medium") ||
    label.includes("acceptable") ||
    label === "1" ||
    label === "2"
  ) {
    return "fair";
  }

  return analyzePulseSignalQuality(samples).signalQuality;
}

function getCleanWindowFingerDetected(signalQuality: PulseSignalQuality) {
  return (
    signalQuality !== "no-signal" &&
    signalQuality !== "too-dark" &&
    signalQuality !== "too-bright"
  );
}

function getAbsoluteErrors(results: PulseValidationResult[]) {
  return results
    .map((result) => result.absoluteError)
    .filter(isFiniteNumber);
}

function summarizeResultSet(
  results: PulseValidationResult[],
): PulseValidationConfidenceSummary {
  const returnedResults = results.filter((result) => result.returnedEstimate);
  const absoluteErrors = getAbsoluteErrors(returnedResults);

  return {
    recordCount: results.length,
    returnedEstimateCount: returnedResults.length,
    meanAbsoluteError: average(absoluteErrors),
    medianAbsoluteError: median(absoluteErrors),
    withinFiveBpmPercent: percent(
      absoluteErrors.filter((error) => error <= 5).length,
      absoluteErrors.length,
    ),
    withinTenBpmPercent: percent(
      absoluteErrors.filter((error) => error <= 10).length,
      absoluteErrors.length,
    ),
  };
}

function summarizeByConfidence(results: PulseValidationResult[]) {
  return CONFIDENCE_LEVELS.reduce(
    (summary, confidence) => ({
      ...summary,
      [confidence]: summarizeResultSet(
        results.filter((result) => result.confidence === confidence),
      ),
    }),
    {} as PulseValidationSummary["byConfidence"],
  );
}

function buildValidationResult(record: ReferencePpgRecord) {
  const samples = toEstimatorSamples(record);
  const signalQuality = getReferenceSignalQuality(record, samples);
  const estimate = estimatePulseFromSamples({
    fingerDetected: getCleanWindowFingerDetected(signalQuality),
    samples,
    signalQuality,
  });
  const returnedEstimate = estimate.bpm !== null;

  return {
    recordId: record.recordId,
    referenceBpm: record.referenceBpm,
    estimatedBpm: estimate.bpm,
    absoluteError: returnedEstimate
      ? Math.abs((estimate.bpm ?? 0) - record.referenceBpm)
      : null,
    confidence: estimate.confidence,
    confidenceScore: estimate.confidenceScore,
    returnedEstimate,
    qualityLabel: record.qualityLabel,
    source: record.source,
  };
}

export function summarizePulseValidationResults(
  results: PulseValidationResult[],
): PulseValidationSummary {
  const returnedResults = results.filter((result) => result.returnedEstimate);
  const absoluteErrors = getAbsoluteErrors(returnedResults);
  const usableRecords = results.filter(
    (result) => !isBadSignalQualityLabel(result.qualityLabel),
  );
  const badSignalRecords = results.filter((result) =>
    isBadSignalQualityLabel(result.qualityLabel),
  );
  const falseNullCount = usableRecords.filter(
    (result) => !result.returnedEstimate,
  ).length;
  const badSignalRejectedCount = badSignalRecords.filter(
    (result) => !result.returnedEstimate,
  ).length;

  return {
    recordCount: results.length,
    returnedEstimateCount: returnedResults.length,
    falseNullCount,
    falseNullRate: percent(falseNullCount, usableRecords.length),
    badSignalRecordCount: badSignalRecords.length,
    badSignalRejectedCount,
    badSignalRejectionRate: percent(
      badSignalRejectedCount,
      badSignalRecords.length,
    ),
    meanAbsoluteError: average(absoluteErrors),
    medianAbsoluteError: median(absoluteErrors),
    withinFiveBpmPercent: percent(
      absoluteErrors.filter((error) => error <= 5).length,
      absoluteErrors.length,
    ),
    withinTenBpmPercent: percent(
      absoluteErrors.filter((error) => error <= 10).length,
      absoluteErrors.length,
    ),
    byConfidence: summarizeByConfidence(results),
  };
}

export function evaluatePulseEstimate(
  records: ReferencePpgRecord[],
): PulseValidationEvaluation {
  const results = records.map(buildValidationResult);

  return {
    results,
    summary: summarizePulseValidationResults(results),
  };
}
