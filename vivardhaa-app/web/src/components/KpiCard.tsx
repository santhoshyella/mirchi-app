import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Tinted variant (used for danger / warning summary cards) */
  tone?: "default" | "danger" | "warning" | "success";
  className?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-[var(--vv-bg0)] border border-[var(--vv-bd)]",
  danger: "bg-[var(--vv-dan-bg)] border border-[var(--vv-dan-bd)]",
  warning: "bg-[var(--vv-am-bg)] border border-[var(--vv-am-bd)]",
  success: "bg-[var(--vv-suc-bg)] border border-[var(--vv-suc-bd)]",
};

const LABEL_TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-[var(--vv-t2)]",
  danger: "text-[var(--vv-dan)]",
  warning: "text-[var(--vv-am)]",
  success: "text-[var(--vv-suc)]",
};

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
  className,
}: Props) {
  return (
    <div className={cn("rounded-vv-md px-3 py-2.5", TONE[tone], className)}>
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          LABEL_TONE[tone]
        )}
      >
        {label}
      </div>
      <div className="vv-mono mt-0.5 text-[18px] font-medium leading-none text-[var(--vv-t0)]">
        {value}
      </div>
      {sub && (
        <div className="vv-mono mt-1 text-[10px] text-[var(--vv-t2)]">
          {sub}
        </div>
      )}
    </div>
  );
}
