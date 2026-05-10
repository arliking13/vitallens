import type { CSSProperties } from "react";

import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import type { BreathMotionResult } from "@/shared/types/check-flow";

type ReportScreenProps = {
  breathResult: BreathMotionResult | null;
  onBack: () => void;
  onRestart: () => void;
};

export function ReportScreen({
  breathResult,
  onBack,
  onRestart,
}: ReportScreenProps) {
  return (
    <div className="flex flex-col">
      <ScreenHeader
        description="Your pulse and breathing results will be summarized here after the check."
        title="Check-in summary"
      />

      <div className="mt-6 grid gap-3">
        <InfoRow delayMs={40} label="Pulse result" tone="pulse" value="Pending" />
        <InfoRow
          delayMs={80}
          label="Breath result"
          tone={breathResult ? "breath" : "neutral"}
          value={breathResult ? "Completed" : "Pending"}
        />
        {breathResult ? (
          <>
            <InfoRow
              delayMs={120}
              label="Rhythm"
              tone="breath"
              value={breathResult.rhythmLabel}
            />
            <InfoRow
              delayMs={160}
              label="Sample"
              tone="breath"
              value={`${breathResult.durationSeconds}s`}
            />
          </>
        ) : null}
      </div>

      <Card className="mt-4" delayMs={breathResult ? 200 : 120} padding="lg">
        <p className="text-sm font-bold text-[var(--vl-text)]">Wellness summary</p>
        <p className="mt-3 text-base leading-7 text-[var(--vl-text-muted)]">
          {breathResult
            ? "Your breath motion check is included as a wellness-only motion summary."
            : "Complete the pulse and breath checks to see a gentle wellness-focused overview of your session."}
        </p>
      </Card>

      <div
        className="vl-glass animate-card-in mt-4 rounded-[22px] px-4 py-3.5"
        style={{ "--card-delay": "160ms" } as CSSProperties}
      >
        <p className="text-sm font-medium leading-6 text-[var(--vl-text-muted)]">
          VitalLens is wellness-only and not for medical decisions.
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
