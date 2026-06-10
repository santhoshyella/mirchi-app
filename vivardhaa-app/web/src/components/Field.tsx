import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

interface FieldShellProps {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FieldShell({
  label,
  required,
  hint,
  error,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--vv-t2)]">
        <span>{label}</span>
        {required && (
          <span className="text-[11px] font-extrabold text-[var(--vv-dan)]">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <span className="text-[10px] font-semibold text-[var(--vv-dan)]">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[10px] text-[var(--vv-t3)]">{hint}</span>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
  suffix?: string;
  error?: boolean;
  computed?: boolean;
}

export function TextInput({
  prefix,
  suffix,
  error,
  computed,
  className,
  ...rest
}: InputProps) {
  const base = cn(
    "w-full rounded-vv-sm bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium leading-[1.4]",
    "border-[0.5px] border-[var(--vv-bd2)] text-[var(--vv-t0)]",
    "focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]",
    "transition-all",
    error && "border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)]",
    computed &&
      "border-[var(--vv-acc-bd)] bg-[var(--vv-acc-bg)] text-[15px] font-extrabold text-[var(--vv-acc)]",
    rest.readOnly &&
      !computed &&
      "cursor-default bg-[var(--vv-bg2)] font-bold text-[var(--vv-t1)]",
    prefix && "pl-7",
    suffix && "pr-9",
    className
  );

  if (prefix || suffix) {
    return (
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[var(--vv-t2)]">
            {prefix}
          </span>
        )}
        <input className={base} {...rest} />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--vv-t3)]">
            {suffix}
          </span>
        )}
      </div>
    );
  }
  return <input className={base} {...rest} />;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function SelectInput({
  error,
  className,
  children,
  ...rest
}: SelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-vv-sm bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium leading-[1.4]",
        "border-[0.5px] border-[var(--vv-bd2)] text-[var(--vv-t0)]",
        "focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]",
        error && "border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)]",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
