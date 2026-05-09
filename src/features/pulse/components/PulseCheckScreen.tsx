import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { SignalPreview } from "@/shared/components/SignalPreview";

type PulseCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
};

export function PulseCheckScreen({ onBack, onNext }: PulseCheckScreenProps) {
  return (
    <div className="flex flex-col">
      <ScreenHeader
        description="Rest your finger over the rear camera and stay still during the reading."
        status="Camera check"
        title="Pulse check"
        tone="pulse"
      />

      <div className="mt-6">
        <SignalPreview
          caption="Soft pulse signal preview"
          label="Camera preview"
          status="Ready"
          tone="pulse"
        />
      </div>

      <div className="mt-4 grid gap-3">
        <InfoRow label="Camera stream" tone="pulse" value="Idle" />
        <InfoRow label="Frame sampler" tone="pulse" value="Idle" />
        <InfoRow label="Pulse estimate" tone="warning" value="Waiting" />
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
