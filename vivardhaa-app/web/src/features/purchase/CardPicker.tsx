import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CardOption<V extends string = string> {
  value: V;
  label: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Active state accent color */
  color?: string;
}

interface Props<V extends string> {
  options: CardOption<V>[];
  value: V | "";
  onChange: (next: V) => void;
  /** Tailwind grid template, eg "grid-cols-2 sm:grid-cols-4" */
  cols?: string;
  className?: string;
}

/**
 * Tappable card-style radio group used for the variety and destination pickers
 * on the New Purchase Item form. Active card shows a check + tinted bg.
 */
export function CardPicker<V extends string>({
  options,
  value,
  onChange,
  cols = "grid-cols-2 sm:grid-cols-4",
  className,
}: Props<V>) {
  return (
    <div className={cn("grid gap-2", cols, className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        const accent = opt.color ?? "var(--vv-acc)";
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-vv-md border-[0.5px] px-3 py-2.5 text-left transition-all",
              "flex min-h-[64px] flex-col gap-0.5",
              active
                ? "border-transparent shadow-sm"
                : "border-[var(--vv-bd2)] bg-[var(--vv-bg0)] hover:bg-[var(--vv-bg1)]"
            )}
            style={
              active
                ? {
                    background: "color-mix(in srgb, " + accent + " 14%, white)",
                    borderColor: accent,
                  }
                : undefined
            }
          >
            {active && (
              <span
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white"
                style={{ background: accent }}
              >
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            <div className="flex min-w-0 items-center gap-1.5">
              {opt.icon && (
                <span className="flex-shrink-0 text-[14px] leading-none">
                  {opt.icon}
                </span>
              )}
              <span
                className={cn(
                  "truncate text-[12px] font-bold",
                  active ? "" : "text-[var(--vv-t0)]"
                )}
                style={active ? { color: accent } : undefined}
              >
                {opt.label}
              </span>
            </div>
            {opt.subtitle && (
              <span className="truncate text-[10px] text-[var(--vv-t2)]">
                {opt.subtitle}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
