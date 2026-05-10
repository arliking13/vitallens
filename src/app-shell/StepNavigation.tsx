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
      className="vl-segmented-control mt-5 overflow-hidden p-1"
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
                  "step-pill grid h-9 w-full place-items-center rounded-full border border-transparent px-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vl-peach)]",
                  isActive
                    ? "vl-segment-active"
                    : "text-[var(--vl-text-muted)] hover:bg-white/40",
                  isComplete && !isActive ? "text-[var(--vl-success)]" : "",
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
