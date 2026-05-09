import type { StepDefinition } from "@/shared/types/check-flow";

export const APP_STEPS: StepDefinition[] = [
  { id: "intro", label: "Intro", shortLabel: "Intro" },
  { id: "pulse", label: "Pulse Check", shortLabel: "Pulse" },
  { id: "breath", label: "Breath Check", shortLabel: "Breath" },
  { id: "report", label: "Report", shortLabel: "Report" },
];

