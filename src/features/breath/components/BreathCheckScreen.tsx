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
    <div className="flex flex-col">
      <ScreenHeader
        description="Place your iPhone on your upper abdomen or chest and breathe normally."
        status="Motion check"
        title="Breath motion check"
        tone="breath"
      />

      <div className="mt-6">
        <SignalPreview
          caption="Slow breathing motion preview"
          label="Motion preview"
          status="Ready"
          tone="breath"
        />
      </div>

      <div className="mt-4 grid gap-3">
        <InfoRow label="Device motion" tone="breath" value="Idle" />
        <InfoRow label="Rhythm window" tone="breath" value="Idle" />
        <InfoRow label="Breathing estimate" tone="warning" value="Waiting" />
      </div>

      <div className="space-y-3 pt-6">
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
