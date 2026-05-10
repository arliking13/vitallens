import type { PulseCheckResult } from "@/shared/types/check-flow";

import { PulseCheckView } from "./PulseCheckView";

type PulseCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
  onResult: (result: PulseCheckResult | null) => void;
};

export function PulseCheckScreen(props: PulseCheckScreenProps) {
  return <PulseCheckView {...props} />;
}
