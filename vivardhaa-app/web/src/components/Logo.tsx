import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  /** Color of the "Vivar" portion. Default: inherit (let parent decide). */
  primaryClass?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

/**
 * The Vivardhaa wordmark — "Vivar" in inherited color, "dhaa" in brand orange.
 */
export function Logo({ className, primaryClass, size = "md" }: LogoProps) {
  return (
    <span
      className={cn(
        "select-none font-extrabold leading-none tracking-tight",
        SIZE[size],
        className
      )}
    >
      <span className={primaryClass}>Vivar</span>
      <span style={{ color: "var(--vv-acc)" }}>dhaa</span>
    </span>
  );
}
