import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 opacity-30">{icon}</div>}
      <div className="text-[13px] font-semibold text-[var(--vv-t1)]">
        {title}
      </div>
      {description && (
        <div className="max-w-[320px] text-[12px] leading-relaxed text-[var(--vv-t3)]">
          {description}
        </div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
