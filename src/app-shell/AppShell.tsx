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
  const activeStepLabel = APP_STEPS[activeIndex]?.label ?? "VitalLens";

  const progressLabel = useMemo(
    () => `Step ${activeIndex + 1} of ${stepOrder.length}`,
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
    <div className="min-h-dvh bg-[#f6f8f4] text-[#26312c]">
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0b6f61]">
              VitalLens
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#1e2823]">
              Wellness check-in
            </h1>
          </div>
          <div className="rounded-lg border border-[#d8ded6] bg-white px-3 py-2 text-right">
            <p className="text-xs font-semibold text-[#66736b]">{progressLabel}</p>
            <p className="mt-1 text-sm font-bold text-[#26312c]">{activeStepLabel}</p>
          </div>
        </header>

        <StepNavigation
          activeStep={activeStep}
          completedSteps={completedSteps}
          onStepSelect={goToStep}
          steps={APP_STEPS}
        />

        <section className="mt-4 flex flex-1 flex-col rounded-lg border border-[#d8ded6] bg-white shadow-sm">
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

