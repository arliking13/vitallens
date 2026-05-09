export type StepId = "intro" | "pulse" | "breath" | "report";

export type StepDefinition = {
  id: StepId;
  label: string;
  shortLabel: string;
};

