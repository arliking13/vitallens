"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import type {
  BreathMotionResult,
  PulseCheckResult,
  WellnessReportInput,
  WellnessSummaryResponse,
} from "@/shared/types/check-flow";

type ReportScreenProps = {
  breathResult: BreathMotionResult | null;
  onBack: () => void;
  onRestart: () => void;
  pulseResult: PulseCheckResult | null;
};

type SummaryStatus = "idle" | "loading" | "ready" | "fallback";

const unavailableSummary: WellnessSummaryResponse = {
  nextStep:
    "Review your local pulse and breath results. You can repeat the check later for another wellness snapshot.",
  observations: [
    "Your local pulse and breath results remain visible.",
    "This check-in is wellness-only and is not for medical decisions.",
  ],
  source: "fallback",
  summary:
    "AI summary is unavailable right now. Your local pulse and breath results are still shown.",
};

function getMotionLabel(result: BreathMotionResult) {
  return result.motionDetected ? "Detected" : "Low";
}

function buildReportInput({
  breathResult,
  pulseResult,
}: {
  breathResult: BreathMotionResult | null;
  pulseResult: PulseCheckResult | null;
}): WellnessReportInput {
  return {
    breath: breathResult
      ? {
          motionLabel: getMotionLabel(breathResult),
          qualityLabel: breathResult.qualityLabel,
          rhythmLabel: breathResult.rhythmLabel,
          sampleSeconds: breathResult.durationSeconds,
          source: "Phone motion",
        }
      : null,
    pulse: pulseResult
      ? {
          bpm: pulseResult.bpm,
          confidence: pulseResult.confidence,
          sampleSeconds: pulseResult.sampleSeconds,
          signalLabel: pulseResult.signalLabel,
          source: pulseResult.source,
        }
      : null,
  };
}

export function ReportScreen({
  breathResult,
  onBack,
  onRestart,
  pulseResult,
}: ReportScreenProps) {
  const [summary, setSummary] = useState<WellnessSummaryResponse | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>("idle");
  const reportInput = useMemo(
    () => buildReportInput({ breathResult, pulseResult }),
    [breathResult, pulseResult],
  );
  const hasAnyResult = Boolean(pulseResult || breathResult);
  const hasBothResults = Boolean(pulseResult && breathResult);
  const summaryButtonLabel =
    summaryStatus === "loading" ? "Generating..." : "Generate summary";

  async function handleGenerateSummary() {
    if (!hasAnyResult || summaryStatus === "loading") {
      return;
    }

    setSummaryStatus("loading");
    setSummary(null);

    try {
      const response = await fetch("/api/wellness-report", {
        body: JSON.stringify(reportInput),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Summary request failed.");
      }

      const nextSummary = (await response.json()) as WellnessSummaryResponse;
      setSummary(nextSummary);
      setSummaryStatus(
        nextSummary.source === "fallback" ? "fallback" : "ready",
      );
    } catch {
      setSummary(unavailableSummary);
      setSummaryStatus("fallback");
    }
  }

  return (
    <div className="flex flex-col">
      <ScreenHeader
        description={
          hasBothResults
            ? "Your local pulse estimate and breath motion check are ready."
            : "Your available wellness check-in results are shown below."
        }
        title="Check-in summary"
      />

      <div className="mt-6 grid gap-4">
        <Card delayMs={40} padding="md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--vl-text)]">
                Pulse result
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--vl-text-muted)]">
                Finger-camera pulse estimate.
              </p>
            </div>
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              {pulseResult ? "Completed" : "Pending"}
            </span>
          </div>
          {pulseResult ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="vl-peach-pill px-3 py-1 text-xs font-bold">
                {pulseResult.bpm} BPM
              </span>
              <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                Confidence: {pulseResult.confidence}
              </span>
              <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                Signal: {pulseResult.signalLabel}
              </span>
              {pulseResult.sampleSeconds !== null ? (
                <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                  Sample: {pulseResult.sampleSeconds}s
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--vl-text-muted)]">
              Complete Pulse to add the pulse estimate to this report.
            </p>
          )}
        </Card>

        <Card delayMs={80} padding="md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--vl-text)]">
                Breath result
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--vl-text-muted)]">
                Motion summary from the phone resting on your chest or abdomen.
              </p>
            </div>
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              {breathResult ? "Completed" : "Pending"}
            </span>
          </div>
          {breathResult ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="vl-peach-pill px-3 py-1 text-xs font-bold">
                Motion: {getMotionLabel(breathResult)}
              </span>
              <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                Rhythm: {breathResult.rhythmLabel}
              </span>
              <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                Quality: {breathResult.qualityLabel}
              </span>
              <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                Sample: {breathResult.durationSeconds}s
              </span>
              <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
                Source: Phone motion
              </span>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--vl-text-muted)]">
              Complete Breath to add phone motion rhythm to this report.
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-4" delayMs={120} padding="lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--vl-text)]">
              IBM wellness summary
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--vl-text-muted)]">
              Uses structured Pulse and Breath data when watsonx is configured.
            </p>
          </div>
          <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
            {summaryStatus === "ready" ? "Ready" : "Optional"}
          </span>
        </div>

        {summary ? (
          <div className="mt-4 space-y-3">
            <p className="text-base leading-7 text-[var(--vl-text-muted)]">
              {summary.summary}
            </p>
            {summary.observations.length > 0 ? (
              <div className="grid gap-2">
                {summary.observations.map((observation, index) => (
                  <p
                    className="rounded-[18px] bg-white/45 px-3 py-2 text-sm leading-6 text-[var(--vl-text-muted)]"
                    key={`${observation}-${index}`}
                  >
                    {observation}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="text-sm font-bold leading-6 text-[var(--vl-text)]">
              {summary.nextStep}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-base leading-7 text-[var(--vl-text-muted)]">
            Generate a short wellness-only summary from the results currently
            available on this device.
          </p>
        )}

        {summaryStatus === "fallback" ? (
          <p className="mt-3 text-sm leading-6 text-[var(--vl-text-muted)]">
            AI summary is unavailable right now. Your local pulse and breath
            results are still shown.
          </p>
        ) : null}

        <Button
          className="mt-4 min-h-12 w-full text-sm"
          disabled={!hasAnyResult || summaryStatus === "loading"}
          onClick={handleGenerateSummary}
          variant={hasAnyResult ? "primary" : "secondary"}
        >
          {summaryButtonLabel}
        </Button>
      </Card>

      <div
        className="vl-glass animate-card-in mt-4 rounded-[22px] px-4 py-3.5"
        style={{ "--card-delay": "160ms" } as CSSProperties}
      >
        <p className="text-sm font-medium leading-6 text-[var(--vl-text-muted)]">
          VitalLens is a wellness-only check-in and is not for medical
          decisions.
        </p>
      </div>

      <div className="space-y-3 pt-6">
        <Button className="w-full" onClick={onRestart}>
          Restart
        </Button>
        <Button className="w-full" onClick={onBack} variant="ghost">
          Back
        </Button>
      </div>
    </div>
  );
}
