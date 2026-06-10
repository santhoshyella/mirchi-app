import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

export function Chip({ active, onClick, className, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "border border-[var(--vv-t0)] bg-[var(--vv-t0)] text-white"
          : "border border-[var(--vv-bd2)] bg-[var(--vv-bg2)] text-[var(--vv-t2)] hover:bg-[var(--vv-bg3)]",
        className
      )}
    >
      {children}
    </button>
  );
}
