import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "ghost"
  | "danger"
  | "success"
  | "soft-primary"
  | "soft-danger"
  | "soft-success"
  | "soft-warning";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--vv-acc)] text-white hover:bg-[var(--vv-acc-hover)] disabled:bg-[var(--vv-bg3)] disabled:text-[var(--vv-t3)]",
  ghost:
    "bg-[var(--vv-bg0)] text-[var(--vv-t1)] border border-[var(--vv-bd2)] hover:bg-[var(--vv-bg2)]",
  danger: "bg-[var(--vv-dan)] text-white hover:opacity-90",
  success: "bg-[var(--vv-suc)] text-white hover:opacity-90",
  // Soft variants — tinted bg + colored text. Lighter than solid for inline
  // row actions where the button shouldn't dominate the card.
  "soft-primary":
    "bg-[var(--vv-acc-bg)] text-[var(--vv-acc)] border border-[var(--vv-acc-bd)] hover:bg-[var(--vv-acc)] hover:text-white hover:border-[var(--vv-acc)]",
  "soft-danger":
    "bg-[var(--vv-dan-bg)] text-[var(--vv-dan)] border border-[var(--vv-dan-bd)] hover:bg-[var(--vv-dan)] hover:text-white hover:border-[var(--vv-dan)]",
  "soft-success":
    "bg-[var(--vv-suc-bg)] text-[var(--vv-suc)] border border-[var(--vv-suc-bd)] hover:bg-[var(--vv-suc)] hover:text-white hover:border-[var(--vv-suc)]",
  "soft-warning":
    "bg-[var(--vv-am-bg)] text-[var(--vv-am)] border border-[var(--vv-am-bd)] hover:bg-[var(--vv-am)] hover:text-white hover:border-[var(--vv-am)]",
};

const SIZE: Record<Size, string> = {
  sm: "text-[11px] px-3 py-1.5 rounded-vv-sm",
  md: "text-[12px] px-4 py-2 rounded-vv-md",
  lg: "text-[13px] px-5 py-2.5 rounded-vv-md",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", fullWidth, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-bold transition-colors disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
