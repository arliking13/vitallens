import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { StatusBadge } from "@/shared/components/StatusBadge";

type IntroScreenProps = {
  onNext: () => void;
};

export function IntroScreen({ onNext }: IntroScreenProps) {
  return (
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <StatusBadge tone="ready">Prototype</StatusBadge>
          <h2 className="mt-4 text-2xl font-bold tracking-normal text-[#1e2823]">
            Start a calm check-in
          </h2>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[#e0e7df] bg-[#fbfdfb] p-4">
        <InfoRow
          detail="Camera and motion access are reserved for the next implementation step."
          label="Sensor modules"
          value="Pending"
        />
        <InfoRow
          detail="The generated content will stay wellness-only and non-diagnostic."
          label="Report mode"
          value="Safe summary"
        />
        <InfoRow
          detail="No account, database, or native iOS layer is planned for this prototype."
          label="App scope"
          value="Browser only"
        />
      </div>

      <div className="mt-auto pt-8">
        <Button className="w-full" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}

