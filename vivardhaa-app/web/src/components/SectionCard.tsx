import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  num: number;
  title: ReactNode;
  subtitle?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  num,
  title,
  subtitle,
  required,
  className,
  children,
}: Props) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-vv-lg border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg1)] px-4 py-2.5">
        <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--vv-acc)] text-[10px] font-extrabold text-white">
          {num}
        </span>
        <span className="text-[12px] font-bold text-[var(--vv-t0)]">
          {title}
          {required && (
            <span className="ml-1 text-[11px] font-extrabold text-[var(--vv-dan)]">
              *
            </span>
          )}
        </span>
        {subtitle && (
          <span className="ml-auto text-[10px] text-[var(--vv-t2)]">
            {subtitle}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3 px-4 py-3.5">{children}</div>
    </div>
  );
}
