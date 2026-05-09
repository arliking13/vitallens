"use client";

import { useMemo, useState } from "react";

import { BreathCheckScreen } from "@/features/breath/components/BreathCheckScreen";
import { IntroScreen } from "@/features/intro/components/IntroScreen";
import { PulseCheckScreen } from "@/features/pulse/components/PulseCheckScreen";
import { ReportScreen } from "@/features/report/components/ReportScreen";
import type { StepId } from "@/shared/types/check-flow";

import { StepNavigation } from "./StepNavigation";
import { APP_STEPS } from "./steps";

const stepOrder = APP_STEPS.map((step) => step.id);

export function AppShell() {
  const [activeStep, setActiveStep] = useState<StepId>("intro");
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

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
    setActiveStep("intro");
  }

  return (
    <div className="min-h-dvh bg-[#F5F7F4] text-[#1C2520]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:max-w-xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold tracking-normal text-[#1C2520]">VitalLens</p>
            <p className="mt-0.5 text-sm font-medium text-[#66706A]">
              Guided wellness check-in
            </p>
          </div>
          <div
            aria-label={`Progress ${activeIndex + 1} of ${stepOrder.length}`}
            className="flex items-center gap-2 rounded-full border border-[#E5EAE4] bg-white/80 px-3 py-2 shadow-[0_8px_22px_rgba(28,37,32,0.045)]"
          >
            <span className="text-xs font-bold text-[#157A6E]">{progressLabel}</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              {stepOrder.map((stepId, index) => (
                <span
                  className={[
                    "h-1.5 rounded-full transition-all",
                    index === activeIndex
                      ? "w-4 bg-[#157A6E]"
                      : completedSteps.includes(stepId)
                        ? "w-1.5 bg-[#69B9B0]"
                        : "w-1.5 bg-[#D9E0D8]",
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

        <section className="mt-7 flex flex-1 flex-col">
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
              onBack={goBack}
              onNext={() => completeAndGoNext("breath")}
            />
          ) : null}
          {activeStep === "report" ? (
            <ReportScreen onBack={goBack} onRestart={restart} />
          ) : null}
        </section>
      </main>
    </div>
  );
}
