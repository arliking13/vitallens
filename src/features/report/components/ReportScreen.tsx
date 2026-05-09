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
    <div className="flex flex-1 flex-col">
      <ScreenHeader
        description="A placeholder summary for the values that will be produced after the sensor and report modules are added."
        status="Report placeholder"
        title="Check-in summary"
        tone="brand"
      />

      <div className="mt-6 grid gap-3">
        <InfoRow label="Pulse result" tone="pulse" value="Pending" />
        <InfoRow label="Breathing result" tone="breath" value="Pending" />
      </div>

      <Card className="mt-4" padding="lg">
        <p className="text-sm font-semibold text-[#1C2520]">Wellness summary</p>
        <p className="mt-3 text-base leading-7 text-[#66706A]">
          Report generation is not connected yet. Later, structured placeholder
          results will be sent to a Next.js API route for a safe wellness-only
          summary.
        </p>
      </Card>

      <div className="mt-4 rounded-[22px] border border-[#ead8bd] bg-[#F4E7D2] px-4 py-3.5">
        <p className="text-sm font-medium leading-6 text-[#705225]">
          VitalLens is not a medical device and does not diagnose, treat, or
          measure blood pressure, SpO2, or ECG.
        </p>
      </div>

      <div className="mt-auto space-y-3 pt-8">
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
