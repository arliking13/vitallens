import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";

type IntroScreenProps = {
  onNext: () => void;
};

const includedItems = [
  {
    title: "Pulse check",
    detail: "A guided camera-based pulse reading experience.",
    tone: "pulse",
  },
  {
    title: "Breath motion check",
    detail: "A guided motion-based breathing rhythm check.",
    tone: "breath",
  },
  {
    title: "Wellness report",
    detail: "A wellness-only summary of the check-in.",
    tone: "brand",
  },
] as const;

export function IntroScreen({ onNext }: IntroScreenProps) {
  return (
    <div className="flex flex-col">
      <ScreenHeader
        description="Move through two gentle checks and end with a calm wellness summary."
        status="Wellness preview"
        title="Wellness check-in"
        tone="brand"
      />

      <Card className="mt-8" delayMs={40} padding="lg">
        <p className="text-sm font-bold text-[var(--vl-text)]">What this includes</p>
        <div className="mt-5 space-y-5">
          {includedItems.map((item) => (
            <div className="flex gap-3" key={item.title}>
              <span
                className="vl-peach-pill mt-0.5 h-9 w-9 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-base font-bold text-[var(--vl-text)]">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--vl-text-muted)]">{item.detail}</p>
              </div>
            </div>
          ))}
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
