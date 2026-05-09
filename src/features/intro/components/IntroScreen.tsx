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

      <Card className="mt-8" padding="lg">
        <p className="text-sm font-semibold text-[#1C2520]">What this includes</p>
        <div className="mt-5 space-y-5">
          {includedItems.map((item) => (
            <div className="flex gap-3" key={item.title}>
              <span
                className={[
                  "mt-1 h-3 w-3 shrink-0 rounded-full",
                  item.tone === "pulse" ? "bg-[#E97E7E]" : "",
                  item.tone === "breath" ? "bg-[#69B9B0]" : "",
                  item.tone === "brand" ? "bg-[#157A6E]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />
              <div>
                <p className="text-base font-semibold text-[#1C2520]">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#66706A]">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-3">
        <InfoRow
          detail="VitalLens runs in the browser with no account, database, or native iOS layer."
          label="App scope"
          tone="brand"
          value="Browser only"
        />
        <InfoRow
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
