"use client";

import { useMemo, useState } from "react";

import { BreathCheckScreen } from "@/features/breath/components/BreathCheckScreen";
import { IntroScreen } from "@/features/intro/components/IntroScreen";
import { PulseCheckScreen } from "@/features/pulse/components/PulseCheckScreen";
import { ReportScreen } from "@/features/report/components/ReportScreen";
import type { BreathMotionResult, StepId } from "@/shared/types/check-flow";

import { StepNavigation } from "./StepNavigation";
import { APP_STEPS } from "./steps";

const stepOrder = APP_STEPS.map((step) => step.id);

export function AppShell() {
  const [activeStep, setActiveStep] = useState<StepId>("intro");
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [breathResult, setBreathResult] =
    useState<BreathMotionResult | null>(null);

  const activeIndex = stepOrder.indexOf(activeStep);

  const progressLabel = useMemo(
    () => `${activeIndex + 1}/${stepOrder.length}`,
    [activeIndex],
  );

  function goToStep(stepId: StepId) {
    setActiveStep(stepId);
  }

  function completeAndGoNext(stepId: StepId) {
    setCompletedSteps((currentSteps) =>
      currentSteps.includes(stepId) ? currentSteps : [...currentSteps, stepId],
    );

    const nextStep = stepOrder[stepOrder.indexOf(stepId) + 1];
    if (nextStep) {
      setActiveStep(nextStep);
    }
  }

  function goBack() {
    const previousStep = stepOrder[activeIndex - 1];
    if (previousStep) {
      setActiveStep(previousStep);
    }
  }

  function restart() {
    setCompletedSteps([]);
    setBreathResult(null);
    setActiveStep("intro");
  }

  return (
    <div className="min-h-dvh bg-[var(--vl-bg)] text-[var(--vl-text)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:max-w-xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold tracking-normal text-[var(--vl-text)]">VitalLens</p>
            <p className="mt-0.5 text-sm font-medium text-[var(--vl-text-muted)]">
              Guided wellness check-in
            </p>
          </div>
          <div
            aria-label={`Progress ${activeIndex + 1} of ${stepOrder.length}`}
            className="vl-glass-pill flex items-center gap-2 px-3 py-2"
          >
            <span className="text-xs font-bold text-[var(--vl-text)]">{progressLabel}</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              {stepOrder.map((stepId, index) => (
                <span
                  className={[
                    "progress-dot",
                    index === activeIndex
                      ? "progress-dot-active"
                      : completedSteps.includes(stepId)
                        ? "progress-dot-complete"
                        : "",
                  ].join(" ")}
                  key={stepId}
                />
              ))}
            </span>
          </div>
        </header>

        <StepNavigation
          activeStep={activeStep}
          completedSteps={completedSteps}
          onStepSelect={goToStep}
          steps={APP_STEPS}
        />

        <section className="mt-6 flex flex-col pb-2">
          <div className="animate-screen-in" key={activeStep}>
            {activeStep === "intro" ? (
              <IntroScreen onNext={() => completeAndGoNext("intro")} />
            ) : null}
            {activeStep === "pulse" ? (
              <PulseCheckScreen
                onBack={goBack}
                onNext={() => completeAndGoNext("pulse")}
              />
            ) : null}
            {activeStep === "breath" ? (
              <BreathCheckScreen
                onResult={setBreathResult}
                onBack={goBack}
                onNext={() => completeAndGoNext("breath")}
              />
            ) : null}
            {activeStep === "report" ? (
              <ReportScreen
                breathResult={breathResult}
                onBack={goBack}
                onRestart={restart}
              />
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
