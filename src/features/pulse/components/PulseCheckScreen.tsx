import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { SignalPreview } from "@/shared/components/SignalPreview";
import { StatusBadge } from "@/shared/components/StatusBadge";

type PulseCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
};

const pulseBars = [22, 36, 58, 82, 66, 44, 30, 48, 76, 88, 54, 34, 46, 72];

export function PulseCheckScreen({ onBack, onNext }: PulseCheckScreenProps) {
  return (
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <StatusBadge tone="pending">Camera placeholder</StatusBadge>
      <h2 className="mt-4 text-2xl font-bold tracking-normal text-[#1e2823]">
        Pulse Check
      </h2>

      <div className="mt-6">
        <SignalPreview bars={pulseBars} label="PPG frame signal" tone="pulse" />
      </div>

      <div className="mt-6">
        <InfoRow label="Camera stream" value="Not connected" />
        <InfoRow label="Frame sampler" value="Not started" />
        <InfoRow label="Heart rhythm estimate" value="Waiting" />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

