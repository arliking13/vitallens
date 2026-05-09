import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { SignalPreview } from "@/shared/components/SignalPreview";

type BreathCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
};

export function BreathCheckScreen({ onBack, onNext }: BreathCheckScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader
        description="Place the phone on the upper abdomen or chest when motion sensing is added. This screen is only a placeholder."
        status="Motion placeholder"
        title="Breath motion check"
        tone="breath"
      />

      <div className="mt-6">
        <SignalPreview
          caption="Motion preview and breathing wave will appear here later."
          label="Motion preview"
          status="Inactive"
          tone="breath"
        />
      </div>

      <div className="mt-4 grid gap-3">
        <InfoRow label="Device motion" tone="breath" value="Not connected" />
        <InfoRow label="Rhythm window" tone="breath" value="Not started" />
        <InfoRow label="Breathing estimate" tone="warning" value="Waiting" />
      </div>

      <div className="mt-auto space-y-3 pt-8">
        <Button className="w-full" onClick={onNext}>
          Continue
        </Button>
        <Button className="w-full" onClick={onBack} variant="ghost">
          Back
        </Button>
      </div>
    </div>
  );
}
