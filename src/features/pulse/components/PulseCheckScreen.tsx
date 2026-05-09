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
    <div className="flex flex-1 flex-col">
      <ScreenHeader
        description="Rest your finger over the rear camera when this flow is implemented. For now, this is a static preview."
        status="Camera placeholder"
        title="Pulse check"
        tone="pulse"
      />

      <div className="mt-6">
        <SignalPreview
          caption="Camera preview and pulse signal will appear here later."
          label="Camera preview"
          status="Inactive"
          tone="pulse"
        />
      </div>

      <div className="mt-4 grid gap-3">
        <InfoRow label="Camera stream" tone="pulse" value="Not connected" />
        <InfoRow label="Frame sampler" tone="pulse" value="Not started" />
        <InfoRow label="Pulse estimate" tone="warning" value="Waiting" />
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
