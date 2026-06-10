import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Add a colored left or top accent stripe. */
  accent?: string;
  accentSide?: "left" | "top";
  padding?: "sm" | "md" | "lg" | "none";
  children: ReactNode;
}

const PAD = {
  none: "p-0",
  sm: "p-3",
  md: "p-3.5",
  lg: "p-4",
};

export function Card({
  className,
  accent,
  accentSide = "left",
  padding = "md",
  children,
  style,
  ...rest
}: Props) {
  const accentStyle: React.CSSProperties = accent
    ? accentSide === "left"
      ? { borderLeft: `3px solid ${accent}` }
      : { borderTop: `3px solid ${accent}` }
    : {};

  return (
    <div
      className={cn(
        "rounded-vv-lg border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg0)]",
        PAD[padding],
        className
      )}
      style={{ ...accentStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
