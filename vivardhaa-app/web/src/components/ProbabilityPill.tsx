import { Pill } from "./Pill";
import type { Probability } from "@/types/domain";

interface Props {
  value: Probability;
  className?: string;
}

export function ProbabilityPill({ value, className }: Props) {
  const tone =
    value === 100
      ? "success"
      : value === 70
        ? "info"
        : value === 0
          ? "danger"
          : "accent";
  return (
    <Pill tone={tone} className={className}>
      <span className="vv-mono">{value}%</span>
    </Pill>
  );
}
