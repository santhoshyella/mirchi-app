import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone =
  | "neutral"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "purple"
  | "inverse";

interface Props {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

const TONE: Record<Tone, string> = {
  neutral:
    "bg-[var(--vv-bg2)] text-[var(--vv-t2)] border border-[var(--vv-bd2)]",
  accent:
    "bg-[var(--vv-acc-bg)] text-[var(--vv-acc)] border border-[var(--vv-acc-bd)]",
  success:
    "bg-[var(--vv-suc-bg)] text-[var(--vv-suc)] border border-[var(--vv-suc-bd)]",
  danger:
    "bg-[var(--vv-dan-bg)] text-[var(--vv-dan)] border border-[var(--vv-dan-bd)]",
  warning:
    "bg-[var(--vv-am-bg)] text-[var(--vv-am)] border border-[var(--vv-am-bd)]",
  info: "bg-[var(--vv-inf-bg)] text-[var(--vv-inf)] border border-[var(--vv-inf-bd)]",
  purple:
    "bg-[var(--vv-pu-bg)] text-[var(--vv-pu)] border border-[var(--vv-pu-bd)]",
  inverse: "bg-[var(--vv-t0)] text-white border border-[var(--vv-t0)]",
};

export function Pill({ tone = "neutral", className, children }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
