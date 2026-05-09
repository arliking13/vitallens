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
    <nav
      aria-label="VitalLens flow"
      className="mt-5 overflow-hidden rounded-full border border-[#E5EAE4] bg-white/70 p-1 shadow-[0_10px_28px_rgba(28,37,32,0.045)]"
    >
      <ol className="grid grid-cols-4 gap-1">
        {steps.map((step) => {
          const isActive = step.id === activeStep;
          const isComplete = completedSteps.includes(step.id);

          return (
            <li key={step.id}>
              <button
                aria-current={isActive ? "step" : undefined}
                className={[
                  "step-pill grid h-9 w-full place-items-center rounded-full px-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157A6E]",
                  isActive
                    ? "bg-[#157A6E] text-white shadow-[0_8px_18px_rgba(21,122,110,0.16)]"
                    : "text-[#66706A] hover:bg-white",
                  isComplete && !isActive ? "text-[#157A6E]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onStepSelect(step.id)}
                type="button"
              >
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
