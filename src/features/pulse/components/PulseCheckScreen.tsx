import { PulseCheckView } from "./PulseCheckView";

type PulseCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
};

export function PulseCheckScreen(props: PulseCheckScreenProps) {
  return <PulseCheckView {...props} />;
}
