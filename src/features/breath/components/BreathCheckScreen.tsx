import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { SignalPreview } from "@/shared/components/SignalPreview";
import { StatusBadge } from "@/shared/components/StatusBadge";

type BreathCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
};

const breathBars = [38, 44, 52, 64, 78, 88, 80, 66, 54, 44, 36, 42, 58, 72];

export function BreathCheckScreen({ onBack, onNext }: BreathCheckScreenProps) {
  return (
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <StatusBadge tone="pending">Motion placeholder</StatusBadge>
      <h2 className="mt-4 text-2xl font-bold tracking-normal text-[#1e2823]">
        Breath Motion Check
      </h2>

      <div className="mt-6">
        <SignalPreview bars={breathBars} label="Motion rhythm" tone="breath" />
      </div>

      <div className="mt-6">
        <InfoRow label="Device motion" value="Not connected" />
        <InfoRow label="Rhythm window" value="Not started" />
        <InfoRow label="Breathing estimate" value="Waiting" />
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

