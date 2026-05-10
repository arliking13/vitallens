import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { InfoRow } from "@/shared/components/InfoRow";
import {
  BreathWavesIcon,
  HeartIcon,
  ReportIcon,
} from "@/shared/components/LineIcons";
import { ScreenHeader } from "@/shared/components/ScreenHeader";

type IntroScreenProps = {
  onNext: () => void;
};

const includedItems = [
  {
    title: "Pulse check",
    detail: "A guided camera-based pulse reading experience.",
    icon: HeartIcon,
  },
  {
    title: "Breath motion check",
    detail: "A guided motion-based breathing rhythm check.",
    icon: BreathWavesIcon,
  },
  {
    title: "Wellness report",
    detail: "A wellness-only summary of the check-in.",
    icon: ReportIcon,
  },
] as const;

export function IntroScreen({ onNext }: IntroScreenProps) {
  return (
    <div className="flex flex-col">
      <ScreenHeader
        description="Move through two gentle checks and end with a calm wellness summary."
        title="Wellness check-in"
      />

      <Card className="mt-8" delayMs={40} padding="lg">
        <p className="text-lg font-bold text-[var(--vl-text)]">
          What this includes
        </p>
        <div className="mt-5 divide-y divide-[rgba(7,27,58,0.08)]">
          {includedItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="flex gap-4 py-4 first:pt-0 last:pb-0"
                key={item.title}
              >
                <span
                  className="vl-glass-icon mt-0.5 h-14 w-14"
                  aria-hidden="true"
                >
                  <Icon className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--vl-text)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--vl-text-muted)]">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 grid gap-3">
        <InfoRow
          delayMs={80}
          detail="VitalLens runs in the browser with no account, database, or native iOS layer."
          label="App scope"
          tone="brand"
          value="Browser only"
        />
        <InfoRow
          delayMs={120}
          detail="Reports stay informational, wellness-focused, and non-diagnostic."
          label="Safety mode"
          tone="warning"
          value="Wellness only"
        />
      </div>

      <div className="pt-6">
        <Button className="w-full" onClick={onNext}>
          Begin check-in
        </Button>
      </div>
    </div>
  );
}
