import { cn } from "@/lib/cn";

interface Props {
  /** Value 0-100 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  className?: string;
}

export function ProgressBar({
  value,
  color = "var(--vv-acc)",
  trackColor = "var(--vv-bg3)",
  height = 5,
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full", className)}
      style={{ height, background: trackColor }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}
