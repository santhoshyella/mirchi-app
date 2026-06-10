import { VARIETY_COLOR, type Variety } from "@/types/domain";
import { cn } from "@/lib/cn";

interface Props {
  variety: Variety | string;
  /** Override colour — used when variety comes from the DB (not the hardcoded enum). */
  color?: string;
  size?: number;
  className?: string;
}

export function VarietyDot({ variety, color, size = 8, className }: Props) {
  const bg =
    color ??
    VARIETY_COLOR[variety as Variety] ??
    "#6b7280";

  return (
    <span
      className={cn("inline-block flex-shrink-0 rounded-full", className)}
      style={{ width: size, height: size, background: bg }}
    />
  );
}
