import { Button } from "@/shared/components/Button";
import { InfoRow } from "@/shared/components/InfoRow";
import { SignalPreview } from "@/shared/components/SignalPreview";
import { StatusBadge } from "@/shared/components/StatusBadge";

type ReportScreenProps = {
  onBack: () => void;
  onRestart: () => void;
};

const reportBars = [52, 60, 44, 72, 64, 80, 56, 68, 48, 76, 62, 70, 50, 58];

export function ReportScreen({ onBack, onRestart }: ReportScreenProps) {
  return (
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <StatusBadge tone="neutral">Report placeholder</StatusBadge>
      <h2 className="mt-4 text-2xl font-bold tracking-normal text-[#1e2823]">
        Wellness Report
      </h2>

      <div className="mt-6">
        <SignalPreview bars={reportBars} label="Structured result summary" tone="report" />
      </div>

      <div className="mt-6">
        <InfoRow label="Pulse result" value="Pending" />
        <InfoRow label="Breath result" value="Pending" />
        <InfoRow
          detail="IBM watsonx.ai integration will be added behind a Next.js API route later."
          label="Report generator"
          value="Not connected"
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        <Button onClick={onRestart}>Restart</Button>
      </div>
    </div>
  );
}

