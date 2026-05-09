import type { CSSProperties } from "react";

import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";

type ReportScreenProps = {
  onBack: () => void;
  onRestart: () => void;
};

export function ReportScreen({ onBack, onRestart }: ReportScreenProps) {
  return (
    <div className="flex flex-col">
      <ScreenHeader
        description="Your pulse and breathing results will be summarized here after the check."
        status="Report preview"
        title="Check-in summary"
        tone="brand"
      />

      <div className="mt-6 grid gap-3">
        <InfoRow delayMs={40} label="Pulse result" tone="pulse" value="Pending" />
        <InfoRow
          delayMs={80}
          label="Breathing result"
          tone="breath"
          value="Pending"
        />
      </div>

      <Card className="mt-4" delayMs={120} padding="lg">
        <p className="text-sm font-semibold text-[#1C2520]">Wellness summary</p>
        <p className="mt-3 text-base leading-7 text-[#66706A]">
          Complete the pulse and breath checks to see a gentle wellness-focused
          overview of your session.
        </p>
      </Card>

      <div
        className="animate-card-in mt-4 rounded-[22px] border border-[#ead8bd] bg-[#F4E7D2] px-4 py-3.5"
        style={{ "--card-delay": "160ms" } as CSSProperties}
      >
        <p className="text-sm font-medium leading-6 text-[#705225]">
          VitalLens is not a medical device and does not diagnose, treat, or
          measure blood pressure, SpO2, or ECG.
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
