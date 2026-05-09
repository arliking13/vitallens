import type { StepDefinition, StepId } from "@/shared/types/check-flow";

type StepNavigationProps = {
  activeStep: StepId;
  completedSteps: StepId[];
  onStepSelect: (stepId: StepId) => void;
  steps: StepDefinition[];
};

export function StepNavigation({
  activeStep,
  completedSteps,
  onStepSelect,
  steps,
}: StepNavigationProps) {
  return (
    <nav aria-label="VitalLens flow" className="overflow-x-auto pb-1">
      <ol className="flex min-w-max gap-2">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          const isComplete = completedSteps.includes(step.id);

          return (
            <li className="flex items-center gap-2" key={step.id}>
              <button
                aria-current={isActive ? "step" : undefined}
                className={[
                  "grid h-12 min-w-24 place-items-center rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6f61]",
                  isActive
                    ? "border-[#0b6f61] bg-[#0b6f61] text-white"
                    : "border-[#d8ded6] bg-white text-[#536159] hover:bg-[#f5f8f6]",
                  isComplete && !isActive ? "border-[#b7d99f] text-[#3b6f1f]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onStepSelect(step.id)}
                type="button"
              >
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 ? (
                <span className="h-px w-4 bg-[#d8ded6]" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

